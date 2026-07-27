from __future__ import annotations

import json
import urllib.request
from typing import Optional

import httpx


class ControlCenterClient:
    def __init__(self, api_base_url: str) -> None:
        self.api_base_url = api_base_url.rstrip("/")

    def _worker_headers(self, worker_token: str | None, machine_key: str | None = None) -> dict[str, str]:
        headers: dict[str, str] = {}
        if worker_token:
            headers["X-Worker-Token"] = worker_token
        elif machine_key:
            headers["X-Machine-Key"] = machine_key
        return headers

    # #region debug-point D:client-report
    def _debug_report(self, hypothesis_id: str, location: str, msg: str, data: Optional[dict] = None) -> None:
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

    def send_heartbeat(
        self,
        device_id: str,
        worker_token: str | None,
        automation_state: str,
        active_windows: int,
        internet_reachable: bool,
        last_error: str | None = None,
    ) -> None:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{self.api_base_url}/api/workers/heartbeat",
                headers=self._worker_headers(worker_token),
                json={
                    "device_id": device_id,
                    "online": True,
                    "internet_reachable": internet_reachable,
                    "automation_state": automation_state,
                    "active_windows": active_windows,
                    "last_error": last_error,
                },
            )
            # #region debug-point E:client-heartbeat
            self._debug_report(
                "E",
                "worker/client.py:send_heartbeat",
                "Heartbeat gonderildi.",
                {
                    "device_id": device_id,
                    "status_code": response.status_code,
                    "has_worker_token": bool(worker_token),
                    "internet_reachable": internet_reachable,
                    "state": automation_state,
                },
            )
            # #endregion
            response.raise_for_status()

    def send_event(self, device_id: str, worker_token: str | None, level: str, event_type: str, message: str) -> None:
        with httpx.Client(timeout=10.0) as client:
            client.post(
                f"{self.api_base_url}/api/workers/events",
                headers=self._worker_headers(worker_token),
                json={
                    "device_id": device_id,
                    "level": level,
                    "event_type": event_type,
                    "message": message,
                },
            ).raise_for_status()

    def fetch_worker_config(self, device_id: str, worker_token: str | None, machine_key: str | None = None) -> dict:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{self.api_base_url}/api/devices/{device_id}/worker-config",
                headers=self._worker_headers(worker_token, machine_key),
            )
            # #region debug-point D:config-fetch
            self._debug_report(
                "D",
                "worker/client.py:fetch_worker_config",
                "Worker config istendi.",
                {
                    "device_id": device_id,
                    "status_code": response.status_code,
                    "has_worker_token": bool(worker_token),
                    "has_machine_key": bool(machine_key),
                },
            )
            # #endregion
            response.raise_for_status()
            return response.json()

    def fetch_commands(self, device_id: str, worker_token: str | None) -> list[dict]:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                f"{self.api_base_url}/api/workers/{device_id}/commands",
                headers=self._worker_headers(worker_token),
            )
            # #region debug-point A:worker-fetch
            self._debug_report(
                "A",
                "worker/client.py:fetch_commands",
                "Worker komut cekme istegi gonderdi.",
                {
                    "device_id": device_id,
                    "status_code": response.status_code,
                    "has_worker_token": bool(worker_token),
                },
            )
            # #endregion
            response.raise_for_status()
            return response.json()

    def acknowledge_command(self, command_id: str, worker_token: str | None, status: str, note: str | None = None) -> None:
        with httpx.Client(timeout=10.0) as client:
            response = client.post(
                f"{self.api_base_url}/api/workers/commands/{command_id}/ack",
                headers=self._worker_headers(worker_token),
                json={"status": status, "note": note},
            )
            # #region debug-point C:ack
            self._debug_report(
                "C",
                "worker/client.py:acknowledge_command",
                "Worker komut sonucu ack gonderdi.",
                {
                    "command_id": command_id,
                    "status_code": response.status_code,
                    "result_status": status,
                    "has_worker_token": bool(worker_token),
                    "note": note,
                },
            )
            # #endregion
            response.raise_for_status()
