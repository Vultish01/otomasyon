from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


AutomationState = Literal[
    "idle",
    "checking",
    "relaunching",
    "logging_in",
    "positioning",
    "error",
]
WindowPosition = Literal["top_left", "top_right", "bottom_left", "bottom_right"]
EventLevel = Literal["info", "warning", "error", "success"]
CommandType = Literal["relogin", "restart_all", "reposition", "start_exe", "run_helper"]
HelperTriggerType = Literal["none", "hotkey", "click"]
MouseButtonType = Literal["left", "right"]


class AuthRegisterRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    password: str = Field(min_length=6, max_length=128)


class AuthLoginRequest(BaseModel):
    email: str
    password: str = Field(min_length=6, max_length=128)


class AuthUser(BaseModel):
    id: str
    name: str
    email: str
    created_at: datetime


class AuthResponse(BaseModel):
    user: AuthUser
    session_token: str


class AuthBootstrapStatus(BaseModel):
    registration_enabled: bool = True
    user_count: int = 0


class WindowProfile(BaseModel):
    id: str
    device_id: str
    slot: int = Field(ge=1, le=4)
    email: str
    credential_id: str
    post_login_choice: Optional[str] = None
    position: WindowPosition
    last_action: str = "Beklemede"


class HelperAutomation(BaseModel):
    enabled: bool = False
    program_path: str = ""
    launch_args: list[str] = Field(default_factory=list)
    trigger: HelperTriggerType = "none"
    hotkey: str = ""
    click_x: int = 0
    click_y: int = 0
    click_button: MouseButtonType = "left"
    wait_after_launch_sec: int = 2


class AutomationRules(BaseModel):
    auto_login_enabled: bool = True
    login_window_keywords: list[str] = Field(
        default_factory=lambda: ["login", "giris", "sign in", "e-posta", "sifre"]
    )
    success_window_keywords: list[str] = Field(default_factory=list)
    email_field_hints: list[str] = Field(default_factory=lambda: ["email", "e-posta", "kullanici"])
    password_field_hints: list[str] = Field(default_factory=lambda: ["sifre", "password"])
    submit_button_hints: list[str] = Field(default_factory=lambda: ["giris", "login", "sign in", "devam"])
    relaunch_wait_sec: int = 4
    post_login_wait_sec: int = 3
    pre_login_hotkey_enabled: bool = False
    pre_login_hotkey: str = ""
    helper_automation: HelperAutomation = Field(default_factory=HelperAutomation)


class DeviceConfig(BaseModel):
    device_id: str
    exe_path: str
    launch_args: list[str] = Field(default_factory=list)
    window_count: int = 4
    health_check_interval_sec: int = 5
    reconnect_cooldown_sec: int = 15
    automation_rules: AutomationRules = Field(default_factory=AutomationRules)
    profiles: list[WindowProfile] = Field(default_factory=list)


class DeviceStatus(BaseModel):
    id: str
    name: str
    os_version: str
    online: bool = True
    internet_reachable: bool = True
    last_heartbeat_at: datetime
    automation_state: AutomationState = "idle"
    last_error: Optional[str] = None
    active_windows: int = 0
    exe_path: str
    retries_today: int = 0


class DeviceRegistrationRequest(BaseModel):
    machine_key: Optional[str] = None
    name: str
    os_version: str
    exe_path: str
    window_count: int = Field(default=4, ge=1, le=4)
    health_check_interval_sec: int = Field(default=5, ge=2, le=300)
    reconnect_cooldown_sec: int = Field(default=15, ge=5, le=600)
    launch_args: list[str] = Field(default_factory=list)


class DeviceClaimRequest(BaseModel):
    device_id: str = Field(min_length=3, max_length=64)
    machine_key: str = Field(min_length=6, max_length=256)


class WorkerConfigPayload(BaseModel):
    api_base_url: str
    device_id: str
    machine_key: Optional[str] = None
    worker_token: Optional[str] = None
    window_count: int = 4
    health_check_interval_sec: int
    reconnect_cooldown_sec: int
    exe_path: str
    launch_args: list[str] = Field(default_factory=list)
    automation_rules: AutomationRules = Field(default_factory=AutomationRules)
    profiles: list[WindowProfile] = Field(default_factory=list)


class DeviceRegistrationResponse(BaseModel):
    device: DeviceStatus
    config: DeviceConfig
    worker_config: WorkerConfigPayload


class DeviceEvent(BaseModel):
    id: str
    device_id: str
    level: EventLevel
    event_type: str
    message: str
    created_at: datetime


class CommandRequest(BaseModel):
    payload: dict = Field(default_factory=dict)


class CommandResponse(BaseModel):
    command_id: str
    status: str


class WorkerCommand(BaseModel):
    id: str
    device_id: str
    command_type: CommandType
    payload: dict = Field(default_factory=dict)
    created_at: datetime


class WorkerCommandAck(BaseModel):
    status: Literal["completed", "failed"] = "completed"
    note: Optional[str] = None


class WorkerHeartbeat(BaseModel):
    device_id: str
    online: bool = True
    internet_reachable: bool = True
    automation_state: AutomationState
    active_windows: int
    last_error: Optional[str] = None


class WorkerEventIn(BaseModel):
    device_id: str
    level: EventLevel
    event_type: str
    message: str


class LogBundle(BaseModel):
    events: list[DeviceEvent]
