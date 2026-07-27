from __future__ import annotations

import json
import logging
from pathlib import Path
import time
import traceback
import urllib.request
from typing import Optional

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


# #region debug-point C:runner-report
def _debug_report(hypothesis_id: str, location: str, msg: str, data: Optional[dict] = None) -> None:
    env_path = ".dbg/remote-command-control.env"
    debug_url = "http://127.0.0.1:7777/event"
    session_id = "remote-command-control"
    try:
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if line.startswith("DEBUG_SERVER_URL="):
                    debug_url = line.split("=", 1)[1] or debug_url
                elif line.startswith("DEBUG_SESSION_ID="):
                    session_id = line.split("=", 1)[1] or session_id
    except Exception:
        pass

    try:
        payload = {
            "sessionId": session_id,
            "runId": "pre-fix",
            "hypothesisId": hypothesis_id,
            "location": location,
            "msg": f"[DEBUG] {msg}",
            "data": data or {},
        }
        request = urllib.request.Request(
            debug_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(request, timeout=1).read()
    except Exception:
        pass


# #endregion


def configure_worker_logger(config_path: str | None = None) -> logging.Logger:
    log_dir = Path(config_path).resolve().parent if config_path else Path.cwd()
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / "worker-runtime.log"

    logger = logging.getLogger("otologin.worker")
    if logger.handlers:
        return logger

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter("%(asctime)s %(levelname)s %(message)s")
    file_handler = logging.FileHandler(log_path, encoding="utf-8")
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)
    return logger


def safe_send_event(
    client: ControlCenterClient,
    config: WorkerConfig,
    logger: logging.Logger,
    level: str,
    event_type: str,
    message: str,
) -> None:
    try:
        client.send_event(config.device_id, config.worker_token, level, event_type, message)
    except Exception:
        logger.warning("Worker event gonderilemedi: %s", event_type, exc_info=True)


def sync_remote_config(client: ControlCenterClient, config: WorkerConfig, config_path: str | None = None) -> WorkerConfig:
    remote_payload = client.fetch_worker_config(config.device_id, config.worker_token, config.machine_key)
    updated_config = merge_worker_config(config, remote_payload)
    if updated_config != config:
        save_worker_config(updated_config, config_path)
    return updated_config


def execute_command(client: ControlCenterClient, config: WorkerConfig, command: dict) -> tuple[str, str | None]:
    command_type = command["command_type"]

    if command_type == "set_credentials":
        try:
            import keyring
            credentials = command.get("payload", {}).get("credentials", [])
            for cred in credentials:
                cred_id = cred.get("credential_id")
                password = cred.get("password")
                if cred_id and password:
                    keyring.set_password("otologin", cred_id, password)
            return ("completed", f"{len(credentials)} adet şifre Windows Credential Manager'a kaydedildi.")
        except ImportError:
            return ("failed", "keyring modülü yüklü değil.")
        except Exception as exc:
            return ("failed", f"Şifre kaydedilirken hata oluştu: {exc}")

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
        commands = client.fetch_commands(config.device_id, config.worker_token)
    except Exception as exc:
        # #region debug-point A:fetch-failed
        _debug_report(
            "A",
            "worker/runner.py:process_pending_commands",
            "Worker komutlari cekemedi.",
            {"device_id": config.device_id, "error": str(exc), "has_worker_token": bool(config.worker_token)},
        )
        # #endregion
        return

    for command in commands:
        status = "completed"
        note = None
        try:
            # #region debug-point C:execute-start
            _debug_report(
                "C",
                "worker/runner.py:process_pending_commands",
                "Worker komut calistirmaya basliyor.",
                {"device_id": config.device_id, "command_id": command["id"], "command_type": command["command_type"]},
            )
            # #endregion
            status, note = execute_command(client, config, command)
        except Exception as exc:
            status = "failed"
            note = str(exc)
            # #region debug-point C:execute-error
            _debug_report(
                "C",
                "worker/runner.py:process_pending_commands",
                "Worker komut execute adiminda hata verdi.",
                {
                    "device_id": config.device_id,
                    "command_id": command["id"],
                    "command_type": command["command_type"],
                    "error": str(exc),
                },
            )
            # #endregion

        try:
            client.acknowledge_command(command["id"], config.worker_token, status, note)
        except Exception:
            pass

        # #region debug-point C:execute-result
        _debug_report(
            "C",
            "worker/runner.py:process_pending_commands",
            "Worker komutu sonuclandirdi.",
            {
                "device_id": config.device_id,
                "command_id": command["id"],
                "command_type": command["command_type"],
                "status": status,
                "note": note,
            },
        )
        # #endregion

        try:
            client.send_event(
                config.device_id,
                config.worker_token,
                "success" if status == "completed" else "error",
                f"command_{command['command_type']}",
                note or f"{command['command_type']} komutu tamamlandi.",
            )
        except Exception:
            pass


def run_loop(config: WorkerConfig, config_path: str | None = None) -> None:
    client = ControlCenterClient(config.api_base_url)
    logger = configure_worker_logger(config_path)
    logger.info("Worker basladi. device_id=%s api=%s", config.device_id, config.api_base_url)
    state = WorkerState.CHECKING

    while True:
        try:
            config = sync_remote_config(client, config, config_path)
        except Exception:
            logger.warning("Remote config cekilemedi.", exc_info=True)

        try:
            process_pending_commands(client, config)
            inspection = inspect_runtime(config)
            if inspection.internet_reachable and inspection.process_count < config.window_count:
                launched = start_missing_processes(config, inspection.process_count)
                if launched > 0:
                    safe_send_event(
                        client,
                        config,
                        logger,
                        "info",
                        "process_started",
                        f"{launched} eksik pencere icin yeni EXE sureci baslatildi.",
                    )
                    inspection = inspect_runtime(config)

            if inspection.internet_reachable and inspection.logout_detected:
                login_result = perform_login_workflow(config)
                if login_result.completed_profiles > 0:
                    safe_send_event(
                        client,
                        config,
                        logger,
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

            try:
                client.send_heartbeat(
                    device_id=config.device_id,
                    worker_token=config.worker_token,
                    automation_state=state.value,
                    active_windows=inspection.active_windows,
                    internet_reachable=signal.internet_reachable,
                    last_error=inspection.last_error if signal.internet_reachable else "Internet yok",
                )
            except Exception:
                logger.warning("Heartbeat gonderilemedi.", exc_info=True)

            if state == WorkerState.RELAUNCHING:
                safe_send_event(
                    client,
                    config,
                    logger,
                    "warning",
                    "restart_started",
                    "EXE yeniden baslatma akisi tetiklendi.",
                )
            elif state == WorkerState.LOGGING_IN:
                safe_send_event(
                    client,
                    config,
                    logger,
                    "info",
                    "login_started",
                    "Kayitli akisa gore login basladi.",
                )
            elif state == WorkerState.POSITIONING:
                safe_send_event(
                    client,
                    config,
                    logger,
                    "success",
                    "positioning",
                    "Pencereler Win32 API ile hizalaniyor.",
                )
        except Exception:
            logger.error("Worker dongusu beklenmeyen hata aldi.\n%s", traceback.format_exc())

        time.sleep(max(config.health_check_interval_sec, 2))


if __name__ == "__main__":
    config_path = str(resolve_worker_config_path())
    logger = configure_worker_logger(config_path)
    try:
        run_loop(load_worker_config(config_path), config_path)
    except Exception:
        logger.error("Worker baslangicinda kritik hata.\n%s", traceback.format_exc())
        raise
