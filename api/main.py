from __future__ import annotations

import os
from typing import Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from api.models import (
    AuthBootstrapStatus,
    AuthLoginRequest,
    AuthRegisterRequest,
    AuthResponse,
    AuthUser,
    CommandRequest,
    CommandResponse,
    DeviceConfig,
    DeviceRegistrationRequest,
    DeviceRegistrationResponse,
    LogBundle,
    WorkerCommandAck,
    WorkerEventIn,
    WorkerHeartbeat,
)
from api.storage import (
    acknowledge_command,
    add_event,
    build_worker_config_payload,
    count_users,
    create_device,
    create_user,
    create_user_session,
    authenticate_user,
    enqueue_command,
    get_device,
    get_device_config,
    get_user_by_session_token,
    initialize_database,
    list_pending_commands,
    list_devices,
    list_events,
    revoke_session,
    update_device_config,
    update_heartbeat,
)

app = FastAPI(title="OtoLogin Control Center API", version="0.1.0")


def get_allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")
    dynamic_origins = [origin.strip() for origin in configured.split(",") if origin.strip()]
    default_origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
    return list(dict.fromkeys(default_origins + dynamic_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
initialize_database()


def require_panel_user(x_session_token: Optional[str] = Header(default=None)) -> AuthUser:
    if not x_session_token:
        raise HTTPException(status_code=401, detail="Oturum gerekli.")
    user = get_user_by_session_token(x_session_token)
    if not user:
        raise HTTPException(status_code=401, detail="Oturum gecersiz veya sona ermis.")
    return user


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "otologin-api", "status": "running"}


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/auth/bootstrap", response_model=AuthBootstrapStatus)
def auth_bootstrap_status() -> AuthBootstrapStatus:
    return AuthBootstrapStatus(registration_enabled=True, user_count=count_users())


@app.post("/api/auth/register", response_model=AuthResponse)
def register_auth_user(payload: AuthRegisterRequest) -> AuthResponse:
    try:
        user = create_user(payload.name, payload.email, payload.password)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    session_token = create_user_session(user.id)
    return AuthResponse(user=user, session_token=session_token)


@app.post("/api/auth/login", response_model=AuthResponse)
def login_auth_user(payload: AuthLoginRequest) -> AuthResponse:
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="E-posta veya sifre hatali.")
    session_token = create_user_session(user.id)
    return AuthResponse(user=user, session_token=session_token)


@app.get("/api/auth/me", response_model=AuthUser)
def get_current_user(user: AuthUser = Depends(require_panel_user)) -> AuthUser:
    return user


@app.post("/api/auth/logout")
def logout_current_user(x_session_token: Optional[str] = Header(default=None)) -> dict[str, str]:
    if x_session_token:
        revoke_session(x_session_token)
    return {"status": "logged_out"}


@app.get("/api/devices")
def get_devices(_: AuthUser = Depends(require_panel_user)):
    return [device.model_dump(mode="json") for device in list_devices()]


@app.post("/api/devices/register", response_model=DeviceRegistrationResponse)
def register_device(payload: DeviceRegistrationRequest, request: Request) -> DeviceRegistrationResponse:
    device, config = create_device(
        machine_key=payload.machine_key,
        name=payload.name,
        os_version=payload.os_version,
        exe_path=payload.exe_path,
        window_count=payload.window_count,
        health_check_interval_sec=payload.health_check_interval_sec,
        reconnect_cooldown_sec=payload.reconnect_cooldown_sec,
        launch_args=payload.launch_args,
    )
    add_event(device.id, "info", "device_registered", "Yeni cihaz panel uzerinden olusturuldu.")
    worker_config = build_worker_config_payload(str(request.base_url).rstrip("/"), config)
    return DeviceRegistrationResponse(device=device, config=config, worker_config=worker_config)


@app.get("/api/devices/{device_id}")
def get_device_detail(device_id: str, _: AuthUser = Depends(require_panel_user)):
    device = get_device(device_id)
    config = get_device_config(device_id)
    if not device or not config:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadi.")
    return {
        "device": device.model_dump(mode="json"),
        "config": config.model_dump(mode="json"),
    }


@app.put("/api/devices/{device_id}/config")
def put_device_config(device_id: str, config: DeviceConfig, _: AuthUser = Depends(require_panel_user)):
    if device_id != config.device_id:
        raise HTTPException(status_code=400, detail="device_id alanlari uyusmuyor.")
    update_device_config(device_id, config)
    add_event(device_id, "info", "config_updated", "Cihaz konfigrasyonu panel uzerinden guncellendi.")
    return {"status": "updated"}


@app.get("/api/devices/{device_id}/worker-config")
def get_worker_config(device_id: str, request: Request):
    config = get_device_config(device_id)
    if not config:
        raise HTTPException(status_code=404, detail="Cihaz konfigurasyonu bulunamadi.")
    return build_worker_config_payload(str(request.base_url).rstrip("/"), config).model_dump(mode="json")


def build_command_response(device_id: str, command_name: str) -> CommandResponse:
    command = enqueue_command(device_id, command_name)
    add_event(device_id, "info", command_name, f"{command_name} komutu kuyruga alindi.")
    return CommandResponse(command_id=command.id, status="queued")


@app.post("/api/devices/{device_id}/commands/relogin")
def relogin(device_id: str, request: CommandRequest, _: AuthUser = Depends(require_panel_user)) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "relogin")


@app.post("/api/devices/{device_id}/commands/reposition")
def reposition(device_id: str, request: CommandRequest, _: AuthUser = Depends(require_panel_user)) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "reposition")


@app.post("/api/devices/{device_id}/commands/restart-all")
def restart_all(device_id: str, request: CommandRequest, _: AuthUser = Depends(require_panel_user)) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "restart_all")


@app.post("/api/devices/{device_id}/commands/run-helper")
def run_helper(device_id: str, request: CommandRequest, _: AuthUser = Depends(require_panel_user)) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "run_helper")


@app.post("/api/workers/heartbeat")
def worker_heartbeat(payload: WorkerHeartbeat) -> dict[str, str]:
    update_heartbeat(
        device_id=payload.device_id,
        online=payload.online,
        internet_reachable=payload.internet_reachable,
        automation_state=payload.automation_state,
        active_windows=payload.active_windows,
        last_error=payload.last_error,
    )
    return {"status": "accepted"}


@app.post("/api/workers/events")
def worker_event(payload: WorkerEventIn):
    event = add_event(payload.device_id, payload.level, payload.event_type, payload.message)
    return event.model_dump(mode="json")


@app.get("/api/workers/{device_id}/commands")
def get_worker_commands(device_id: str):
    return [command.model_dump(mode="json") for command in list_pending_commands(device_id)]


@app.post("/api/workers/commands/{command_id}/ack")
def ack_worker_command(command_id: str, payload: WorkerCommandAck):
    acknowledge_command(command_id, payload.status, payload.note)
    return {"status": "acknowledged"}


@app.get("/api/logs", response_model=LogBundle)
def logs(_: AuthUser = Depends(require_panel_user)) -> LogBundle:
    return LogBundle(events=list_events())
