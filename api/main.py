from __future__ import annotations

import os
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.models import CommandRequest, CommandResponse, DeviceConfig, LogBundle, WorkerEventIn, WorkerHeartbeat
from api.storage import (
    add_event,
    get_device,
    get_device_config,
    initialize_database,
    list_devices,
    list_events,
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


@app.get("/")
def root() -> dict[str, str]:
    return {"service": "otologin-api", "status": "running"}


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/devices")
def get_devices():
    return [device.model_dump(mode="json") for device in list_devices()]


@app.get("/api/devices/{device_id}")
def get_device_detail(device_id: str):
    device = get_device(device_id)
    config = get_device_config(device_id)
    if not device or not config:
        raise HTTPException(status_code=404, detail="Cihaz bulunamadi.")
    return {
        "device": device.model_dump(mode="json"),
        "config": config.model_dump(mode="json"),
    }


@app.put("/api/devices/{device_id}/config")
def put_device_config(device_id: str, config: DeviceConfig):
    if device_id != config.device_id:
        raise HTTPException(status_code=400, detail="device_id alanlari uyusmuyor.")
    update_device_config(device_id, config)
    add_event(device_id, "info", "config_updated", "Cihaz konfigrasyonu panel uzerinden guncellendi.")
    return {"status": "updated"}


def build_command_response(device_id: str, command_name: str) -> CommandResponse:
    add_event(device_id, "info", command_name, f"{command_name} komutu kuyruga alindi.")
    return CommandResponse(command_id=str(uuid.uuid4()), status="queued")


@app.post("/api/devices/{device_id}/commands/relogin")
def relogin(device_id: str, request: CommandRequest) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "relogin")


@app.post("/api/devices/{device_id}/commands/reposition")
def reposition(device_id: str, request: CommandRequest) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "reposition")


@app.post("/api/devices/{device_id}/commands/restart-all")
def restart_all(device_id: str, request: CommandRequest) -> CommandResponse:
    _ = request
    return build_command_response(device_id, "restart_all")


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


@app.get("/api/logs", response_model=LogBundle)
def logs() -> LogBundle:
    return LogBundle(events=list_events())
