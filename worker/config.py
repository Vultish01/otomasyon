from __future__ import annotations

import json
import os
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class WindowProfile:
    id: str
    device_id: str
    slot: int
    email: str
    credential_id: str
    post_login_choice: str | None = None
    position: str = "top_left"
    last_action: str = "Beklemede"


@dataclass
class HelperAutomation:
    enabled: bool = False
    program_path: str = ""
    launch_args: list[str] = field(default_factory=list)
    trigger: str = "none"
    hotkey: str = ""
    click_x: int = 0
    click_y: int = 0
    click_button: str = "left"
    wait_after_launch_sec: int = 2


@dataclass
class AutomationRules:
    auto_login_enabled: bool = True
    login_window_keywords: list[str] = field(
        default_factory=lambda: ["login", "giris", "sign in", "e-posta", "sifre"]
    )
    success_window_keywords: list[str] = field(default_factory=list)
    email_field_hints: list[str] = field(default_factory=lambda: ["email", "e-posta", "kullanici"])
    password_field_hints: list[str] = field(default_factory=lambda: ["sifre", "password"])
    submit_button_hints: list[str] = field(default_factory=lambda: ["giris", "login", "sign in", "devam"])
    relaunch_wait_sec: int = 4
    post_login_wait_sec: int = 3
    pre_login_hotkey_enabled: bool = False
    pre_login_hotkey: str = ""
    helper_automation: HelperAutomation = field(default_factory=HelperAutomation)


@dataclass
class WorkerConfig:
    api_base_url: str = "http://127.0.0.1:8000"
    device_id: str = ""
    machine_key: str | None = None
    worker_token: str | None = None
    window_count: int = 4
    health_check_interval_sec: int = 5
    reconnect_cooldown_sec: int = 15
    exe_path: str = r"C:\Apps\BrokerDesk\broker.exe"
    launch_args: list[str] = field(default_factory=list)
    automation_rules: AutomationRules = field(default_factory=AutomationRules)
    profiles: list[WindowProfile] = field(default_factory=list)


def _default_config_path() -> Path:
    return Path(os.getenv("OTOLOGIN_WORKER_CONFIG", "worker-config.json")).resolve()


def resolve_worker_config_path(config_path: str | None = None) -> Path:
    return Path(config_path).resolve() if config_path else _default_config_path()


def load_worker_config(config_path: str | None = None) -> WorkerConfig:
    resolved_path = resolve_worker_config_path(config_path)

    if not resolved_path.exists():
        return WorkerConfig()

    # PowerShell on Windows may write UTF-8 files with BOM; accept both forms.
    payload = json.loads(resolved_path.read_text(encoding="utf-8-sig"))
    automation_rules_payload = payload.get("automation_rules", {})
    return WorkerConfig(
        api_base_url=payload.get("api_base_url", "http://127.0.0.1:8000"),
        device_id=payload.get("device_id", ""),
        machine_key=payload.get("machine_key"),
        worker_token=payload.get("worker_token"),
        window_count=payload.get("window_count", 4),
        health_check_interval_sec=payload.get("health_check_interval_sec", 5),
        reconnect_cooldown_sec=payload.get("reconnect_cooldown_sec", 15),
        exe_path=payload.get("exe_path", r"C:\Apps\BrokerDesk\broker.exe"),
        launch_args=payload.get("launch_args", []),
        automation_rules=AutomationRules(
            **{
                **automation_rules_payload,
                "helper_automation": HelperAutomation(**automation_rules_payload.get("helper_automation", {})),
            }
        ),
        profiles=[WindowProfile(**item) for item in payload.get("profiles", [])],
    )


def save_worker_config(config: WorkerConfig, config_path: str | None = None) -> Path:
    resolved_path = resolve_worker_config_path(config_path)
    resolved_path.write_text(
        json.dumps(
            {
                "api_base_url": config.api_base_url,
                "device_id": config.device_id,
                "machine_key": config.machine_key,
                "worker_token": config.worker_token,
                "window_count": config.window_count,
                "health_check_interval_sec": config.health_check_interval_sec,
                "reconnect_cooldown_sec": config.reconnect_cooldown_sec,
                "exe_path": config.exe_path,
                "launch_args": config.launch_args,
                "automation_rules": asdict(config.automation_rules),
                "profiles": [asdict(profile) for profile in config.profiles],
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    return resolved_path


def merge_worker_config(current: WorkerConfig, remote_payload: dict) -> WorkerConfig:
    automation_rules_payload = remote_payload.get("automation_rules", asdict(current.automation_rules))
    return WorkerConfig(
        api_base_url=remote_payload.get("api_base_url", current.api_base_url),
        device_id=remote_payload.get("device_id", current.device_id),
        machine_key=remote_payload.get("machine_key", current.machine_key),
        worker_token=remote_payload.get("worker_token", current.worker_token),
        window_count=remote_payload.get("window_count", current.window_count),
        health_check_interval_sec=remote_payload.get("health_check_interval_sec", current.health_check_interval_sec),
        reconnect_cooldown_sec=remote_payload.get("reconnect_cooldown_sec", current.reconnect_cooldown_sec),
        exe_path=remote_payload.get("exe_path", current.exe_path),
        launch_args=remote_payload.get("launch_args", current.launch_args),
        automation_rules=AutomationRules(
            **{
                **automation_rules_payload,
                "helper_automation": HelperAutomation(**automation_rules_payload.get("helper_automation", {})),
            }
        ),
        profiles=[WindowProfile(**item) for item in remote_payload.get("profiles", [asdict(profile) for profile in current.profiles])],
    )
