from __future__ import annotations

import time

from worker.automation import (
    close_target_processes,
    inspect_runtime,
    perform_login_workflow,
    reposition_windows,
    run_helper_automation,
    start_missing_processes,
)
from worker.client import ControlCenterClient
from worker.config import WorkerConfig, load_worker_config, merge_worker_config, resolve_worker_config_path, save_worker_config
from worker.state_machine import RuntimeSignal, WorkerState, next_state


def sync_remote_config(client: ControlCenterClient, config: WorkerConfig, config_path: str | None = None) -> WorkerConfig:
    remote_payload = client.fetch_worker_config(config.device_id)
    updated_config = merge_worker_config(config, remote_payload)
    if updated_config != config:
        save_worker_config(updated_config, config_path)
    return updated_config


def execute_command(client: ControlCenterClient, config: WorkerConfig, command: dict) -> tuple[str, str | None]:
    command_type = command["command_type"]

    if command_type == "start_exe":
        started = start_missing_processes(config, 0)
        return ("completed", f"{started} surec baslatildi.")

    if command_type == "reposition":
        positioned = reposition_windows(config.exe_path, config.window_count)
        return ("completed", f"{positioned} pencere yeniden hizalandi.")

    if command_type == "run_helper":
        success, note = run_helper_automation(config)
        return ("completed" if success else "failed", note or "Yardimci otomasyon calistirildi.")

    if command_type in {"restart_all", "relogin"}:
        closed = close_target_processes(config.exe_path)
        time.sleep(config.automation_rules.relaunch_wait_sec)
        started = start_missing_processes(config, 0)
        note = f"{closed} surec kapatildi, {started} surec yeniden acildi."

        if command_type == "relogin":
            time.sleep(config.automation_rules.post_login_wait_sec)
            login_result = perform_login_workflow(config)
            note = (
                f"{note} Login denemesi: {login_result.completed_profiles}/{max(login_result.attempted_profiles, 1)}."
            )
            if login_result.completed_profiles == 0:
                return ("failed", login_result.note or note)
        return ("completed", note)

    return ("failed", f"Bilinmeyen komut: {command_type}")


def process_pending_commands(client: ControlCenterClient, config: WorkerConfig) -> None:
    try:
        commands = client.fetch_commands(config.device_id)
    except Exception:
        return

    for command in commands:
        status = "completed"
        note = None
        try:
            status, note = execute_command(client, config, command)
        except Exception as exc:
            status = "failed"
            note = str(exc)

        try:
            client.acknowledge_command(command["id"], status, note)
        except Exception:
            pass

        try:
            client.send_event(
                config.device_id,
                "success" if status == "completed" else "error",
                f"command_{command['command_type']}",
                note or f"{command['command_type']} komutu tamamlandi.",
            )
        except Exception:
            pass


def run_loop(config: WorkerConfig, config_path: str | None = None) -> None:
    client = ControlCenterClient(config.api_base_url)
    state = WorkerState.CHECKING

    while True:
        try:
            config = sync_remote_config(client, config, config_path)
        except Exception:
            pass

        process_pending_commands(client, config)
        inspection = inspect_runtime(config)
        if inspection.internet_reachable and inspection.process_count < config.window_count:
            launched = start_missing_processes(config, inspection.process_count)
            if launched > 0:
                client.send_event(
                    config.device_id,
                    "info",
                    "process_started",
                    f"{launched} eksik pencere icin yeni EXE sureci baslatildi.",
                )
                inspection = inspect_runtime(config)

        if inspection.internet_reachable and inspection.logout_detected:
            login_result = perform_login_workflow(config)
            if login_result.completed_profiles > 0:
                client.send_event(
                    config.device_id,
                    "success",
                    "login_completed",
                    f"{login_result.completed_profiles} pencere icin login tamamlandi.",
                )
                inspection = inspect_runtime(config)
            elif login_result.note:
                inspection.last_error = login_result.note

        if inspection.internet_reachable and inspection.positioning_required and inspection.active_windows > 0:
            positioned = reposition_windows(config.exe_path, min(config.window_count, inspection.active_windows))
            if positioned:
                inspection.positioning_required = False

        signal = RuntimeSignal(
            internet_reachable=inspection.internet_reachable,
            logout_detected=inspection.logout_detected,
            login_screen_visible=inspection.login_screen_visible,
            positioning_required=inspection.positioning_required,
        )
        state = next_state(state, signal)

        client.send_heartbeat(
            device_id=config.device_id,
            automation_state=state.value,
            active_windows=inspection.active_windows,
            internet_reachable=signal.internet_reachable,
            last_error=inspection.last_error if signal.internet_reachable else "Internet yok",
        )

        if state == WorkerState.RELAUNCHING:
            client.send_event(config.device_id, "warning", "restart_started", "EXE yeniden baslatma akisi tetiklendi.")
        elif state == WorkerState.LOGGING_IN:
            client.send_event(config.device_id, "info", "login_started", "Kayitli akisa gore login basladi.")
        elif state == WorkerState.POSITIONING:
            client.send_event(config.device_id, "success", "positioning", "Pencereler Win32 API ile hizalaniyor.")

        time.sleep(config.health_check_interval_sec)


if __name__ == "__main__":
    config_path = str(resolve_worker_config_path())
    run_loop(load_worker_config(config_path), config_path)
