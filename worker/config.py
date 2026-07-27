from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WorkerConfig:
    api_base_url: str = "http://127.0.0.1:8000"
    device_id: str = "win-floor-01"
    health_check_interval_sec: int = 5
    reconnect_cooldown_sec: int = 15
    exe_path: str = r"C:\Apps\BrokerDesk\broker.exe"
    launch_args: list[str] = field(default_factory=list)


def _default_config_path() -> Path:
    return Path(os.getenv("OTOLOGIN_WORKER_CONFIG", "worker-config.json")).resolve()


def load_worker_config(config_path: str | None = None) -> WorkerConfig:
    resolved_path = Path(config_path).resolve() if config_path else _default_config_path()

    if not resolved_path.exists():
        return WorkerConfig()

    payload = json.loads(resolved_path.read_text(encoding="utf-8"))
    return WorkerConfig(
        api_base_url=payload.get("api_base_url", "http://127.0.0.1:8000"),
        device_id=payload.get("device_id", "win-floor-01"),
        health_check_interval_sec=payload.get("health_check_interval_sec", 5),
        reconnect_cooldown_sec=payload.get("reconnect_cooldown_sec", 15),
        exe_path=payload.get("exe_path", r"C:\Apps\BrokerDesk\broker.exe"),
        launch_args=payload.get("launch_args", []),
    )
