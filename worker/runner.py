from __future__ import annotations

import time

from worker.client import ControlCenterClient
from worker.config import WorkerConfig, load_worker_config
from worker.state_machine import RuntimeSignal, WorkerState, next_state


def detect_runtime_signal() -> RuntimeSignal:
    """
    Gercek implementasyonda bu alan internet kontrolu, pywinauto ile login ekrani tespiti
    ve gerekirse OCR ile yedek goruntu eslesmesi kullanacak.
    """
    return RuntimeSignal(
        internet_reachable=True,
        logout_detected=False,
        login_screen_visible=False,
        positioning_required=False,
    )


def run_loop(config: WorkerConfig) -> None:
    client = ControlCenterClient(config.api_base_url)
    state = WorkerState.CHECKING

    while True:
        signal = detect_runtime_signal()
        state = next_state(state, signal)

        client.send_heartbeat(
            device_id=config.device_id,
            automation_state=state.value,
            active_windows=4,
            internet_reachable=signal.internet_reachable,
            last_error=None if signal.internet_reachable else "Internet yok",
        )

        if state == WorkerState.RELAUNCHING:
            client.send_event(config.device_id, "warning", "restart_started", "EXE yeniden baslatma akisi tetiklendi.")
        elif state == WorkerState.LOGGING_IN:
            client.send_event(config.device_id, "info", "login_started", "Kayitli akisa gore login basladi.")
        elif state == WorkerState.POSITIONING:
            client.send_event(config.device_id, "success", "positioning", "Pencereler Win32 API ile hizalaniyor.")

        time.sleep(config.health_check_interval_sec)


if __name__ == "__main__":
    run_loop(load_worker_config())
