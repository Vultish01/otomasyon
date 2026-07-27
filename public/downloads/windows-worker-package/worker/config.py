from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WorkerConfig:
    api_base_url: str = "http://127.0.0.1:8000"
    device_id: str = "win-floor-01"
    machine_key: str | None = None
    window_count: int = 4
    health_check_interval_sec: int = 5
    reconnect_cooldown_sec: int = 15
    exe_path: str = r"C:\Apps\BrokerDesk\broker.exe"
    launch_args: list[str] = field(default_factory=list)


def _default_config_path() -> Path:
    return Path(os.getenv("OTOLOGIN_WORKER_CONFIG", "worker-config.json")).resolve()


def resolve_worker_config_path(config_path: str | None = None) -> Path:
    return Path(config_path).resolve() if config_path else _default_config_path()


def load_worker_config(config_path: str | None = None) -> WorkerConfig:
    resolved_path = resolve_worker_config_path(config_path)

    if not resolved_path.exists():
        return WorkerConfig()

    payload = json.loads(resolved_path.read_text(encoding="utf-8"))
    return WorkerConfig(
        api_base_url=payload.get("api_base_url", "http://127.0.0.1:8000"),
        device_id=payload.get("device_id", "win-floor-01"),
        machine_key=payload.get("machine_key"),
        window_count=payload.get("window_count", 4),
        health_check_interval_sec=payload.get("health_check_interval_sec", 5),
        reconnect_cooldown_sec=payload.get("reconnect_cooldown_sec", 15),
        exe_path=payload.get("exe_path", r"C:\Apps\BrokerDesk\broker.exe"),
        launch_args=payload.get("launch_args", []),
    )


def save_worker_config(config: WorkerConfig, config_path: str | None = None) -> Path:
    resolved_path = resolve_worker_config_path(config_path)
    resolved_path.write_text(
        json.dumps(
            {
                "api_base_url": config.api_base_url,
                "device_id": config.device_id,
                "machine_key": config.machine_key,
                "window_count": config.window_count,
                "health_check_interval_sec": config.health_check_interval_sec,
                "reconnect_cooldown_sec": config.reconnect_cooldown_sec,
                "exe_path": config.exe_path,
                "launch_args": config.launch_args,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return resolved_path


def merge_worker_config(current: WorkerConfig, remote_payload: dict) -> WorkerConfig:
    return WorkerConfig(
        api_base_url=remote_payload.get("api_base_url", current.api_base_url),
        device_id=remote_payload.get("device_id", current.device_id),
        machine_key=remote_payload.get("machine_key", current.machine_key),
        window_count=remote_payload.get("window_count", current.window_count),
        health_check_interval_sec=remote_payload.get("health_check_interval_sec", current.health_check_interval_sec),
        reconnect_cooldown_sec=remote_payload.get("reconnect_cooldown_sec", current.reconnect_cooldown_sec),
        exe_path=remote_payload.get("exe_path", current.exe_path),
        launch_args=remote_payload.get("launch_args", current.launch_args),
    )
