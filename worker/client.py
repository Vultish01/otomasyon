from __future__ import annotations

import httpx


class ControlCenterClient:
    def __init__(self, api_base_url: str) -> None:
        self.api_base_url = api_base_url.rstrip("/")

    def send_heartbeat(
        self,
        device_id: str,
        automation_state: str,
        active_windows: int,
        internet_reachable: bool,
        last_error: str | None = None,
    ) -> None:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{self.api_base_url}/api/workers/heartbeat",
                json={
                    "device_id": device_id,
                    "online": True,
                    "internet_reachable": internet_reachable,
                    "automation_state": automation_state,
                    "active_windows": active_windows,
                    "last_error": last_error,
                },
            ).raise_for_status()

    def send_event(self, device_id: str, level: str, event_type: str, message: str) -> None:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{self.api_base_url}/api/workers/events",
                json={
                    "device_id": device_id,
                    "level": level,
                    "event_type": event_type,
                    "message": message,
                },
            ).raise_for_status()
