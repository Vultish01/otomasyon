from __future__ import annotations

import time

from worker.automation import inspect_runtime, reposition_windows, start_missing_processes
from worker.client import ControlCenterClient
from worker.config import WorkerConfig, load_worker_config, merge_worker_config, resolve_worker_config_path, save_worker_config
from worker.state_machine import RuntimeSignal, WorkerState, next_state


def sync_remote_config(client: ControlCenterClient, config: WorkerConfig, config_path: str | None = None) -> WorkerConfig:
    remote_payload = client.fetch_worker_config(config.device_id)
    updated_config = merge_worker_config(config, remote_payload)
    if updated_config != config:
        save_worker_config(updated_config, config_path)
    return updated_config


def run_loop(config: WorkerConfig, config_path: str | None = None) -> None:
    client = ControlCenterClient(config.api_base_url)
    state = WorkerState.CHECKING

    while True:
        try:
            config = sync_remote_config(client, config, config_path)
        except Exception:
            pass

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

        if inspection.internet_reachable and inspection.active_windows > 0:
            positioned = reposition_windows(config.exe_path, min(config.window_count, inspection.active_windows))
            if positioned:
                inspection.positioning_required = positioned != config.window_count

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
