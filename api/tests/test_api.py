import uuid

from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def auth_headers() -> dict[str, str]:
    email = f"test-{uuid.uuid4().hex[:8]}@example.com"
    response = client.post(
        "/api/auth/register",
        json={
            "name": "Test Admin",
            "email": email,
            "password": "12345678",
        },
    )
    assert response.status_code == 200
    token = response.json()["session_token"]
    return {"X-Session-Token": token}


def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_auth_register_and_me_flow():
    email = f"bootstrap-{uuid.uuid4().hex[:8]}@example.com"
    register_response = client.post(
        "/api/auth/register",
        json={
            "name": "Bootstrap Admin",
            "email": email,
            "password": "12345678",
        },
    )
    assert register_response.status_code == 200
    token = register_response.json()["session_token"]

    me_response = client.get("/api/auth/me", headers={"X-Session-Token": token})
    assert me_response.status_code == 200
    assert me_response.json()["email"] == email


def test_devices_endpoint_returns_empty_or_real_devices():
    response = client.get("/api/devices", headers=auth_headers())
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


def test_worker_event_creates_log_entry():
    register_response = client.post(
        "/api/devices/register",
        json={
            "machine_key": f"machine-event-{uuid.uuid4().hex[:6]}",
            "name": "Event PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 1,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    device_id = register_response.json()["device"]["id"]
    response = client.post(
        "/api/workers/events",
        json={
            "device_id": device_id,
            "level": "info",
            "event_type": "manual_test",
            "message": "Test logu olustu.",
        },
    )
    assert response.status_code == 200
    assert response.json()["event_type"] == "manual_test"


def test_device_registration_returns_worker_config():
    response = client.post(
        "/api/devices/register",
        json={
            "machine_key": "machine-test-001",
            "name": "Test PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 4,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": ["--demo"],
        },
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["device"]["name"] == "Test PC"
    assert payload["worker_config"]["device_id"] == payload["device"]["id"]
    assert payload["worker_config"]["machine_key"] == "machine-test-001"
    assert payload["worker_config"]["window_count"] == 4
    assert payload["worker_config"]["launch_args"] == ["--demo"]


def test_device_registration_reuses_existing_machine_key():
    first = client.post(
        "/api/devices/register",
        json={
            "machine_key": "machine-test-duplicate",
            "name": "Test PC 02",
            "os_version": "Windows 10 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 2,
            "health_check_interval_sec": 5,
            "reconnect_cooldown_sec": 15,
            "launch_args": [],
        },
    )
    second = client.post(
        "/api/devices/register",
        json={
            "machine_key": "machine-test-duplicate",
            "name": "Test PC 02 Updated",
            "os_version": "Windows 11 Pro",
            "exe_path": r"D:\Apps\Test\broker.exe",
            "window_count": 3,
            "health_check_interval_sec": 7,
            "reconnect_cooldown_sec": 18,
            "launch_args": ["--demo"],
        },
    )
    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["device"]["id"] == second.json()["device"]["id"]
    assert second.json()["config"]["window_count"] == 3


def test_worker_config_endpoint_returns_device_payload():
    register_response = client.post(
        "/api/devices/register",
        json={
            "machine_key": f"machine-worker-config-{uuid.uuid4().hex[:6]}",
            "name": "Worker Config PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 2,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    device_id = register_response.json()["device"]["id"]
    response = client.get(f"/api/devices/{device_id}/worker-config")
    assert response.status_code == 200
    payload = response.json()
    assert payload["device_id"] == device_id
    assert "exe_path" in payload
