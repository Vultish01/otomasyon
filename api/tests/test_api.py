import uuid

import pytest
from fastapi.testclient import TestClient

from api.main import app
from api.storage import create_user, create_user_session, execute, get_connection


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_database():
    with get_connection() as connection:
        for table_name in (
            "device_commands",
            "device_events",
            "window_profiles",
            "device_configs",
            "devices",
            "user_sessions",
            "users",
        ):
            execute(connection, f"DELETE FROM {table_name}")
    yield


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


def test_registration_is_closed_after_first_user():
    first = client.post(
        "/api/auth/register",
        json={
            "name": "Primary Admin",
            "email": f"primary-{uuid.uuid4().hex[:8]}@example.com",
            "password": "12345678",
        },
    )
    second = client.post(
        "/api/auth/register",
        json={
            "name": "Second Admin",
            "email": f"second-{uuid.uuid4().hex[:8]}@example.com",
            "password": "12345678",
        },
    )
    bootstrap = client.get("/api/auth/bootstrap")

    assert first.status_code == 200
    assert second.status_code == 403
    assert bootstrap.status_code == 200
    assert bootstrap.json()["registration_enabled"] is False


def test_devices_endpoint_returns_empty_or_real_devices():
    response = client.get("/api/devices", headers=auth_headers())
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)


def test_devices_are_isolated_per_user():
    first_email = f"owner-{uuid.uuid4().hex[:8]}@example.com"
    first_register = client.post(
        "/api/auth/register",
        json={
            "name": "Owner",
            "email": first_email,
            "password": "12345678",
        },
    )
    first_headers = {"X-Session-Token": first_register.json()["session_token"]}

    other_user = create_user("Other User", f"other-{uuid.uuid4().hex[:8]}@example.com", "12345678")
    other_headers = {"X-Session-Token": create_user_session(other_user.id)}

    register_response = client.post(
        "/api/devices/register",
        headers=first_headers,
        json={
            "machine_key": f"machine-owned-{uuid.uuid4().hex[:6]}",
            "name": "Owner PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 1,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    device_id = register_response.json()["device"]["id"]

    first_devices = client.get("/api/devices", headers=first_headers)
    other_devices = client.get("/api/devices", headers=other_headers)
    other_detail = client.get(f"/api/devices/{device_id}", headers=other_headers)

    assert register_response.status_code == 200
    assert first_devices.status_code == 200
    assert len(first_devices.json()) == 1
    assert other_devices.status_code == 200
    assert other_devices.json() == []
    assert other_detail.status_code == 404


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
    worker_token = register_response.json()["worker_config"]["worker_token"]
    response = client.post(
        "/api/workers/events",
        headers={"X-Worker-Token": worker_token},
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
    assert payload["worker_config"]["worker_token"]
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
    worker_token = register_response.json()["worker_config"]["worker_token"]
    response = client.get(
        f"/api/devices/{device_id}/worker-config",
        headers={"X-Worker-Token": worker_token},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["device_id"] == device_id
    assert payload["worker_token"] == worker_token
    assert "exe_path" in payload


def test_worker_config_bootstraps_with_machine_key_when_token_missing():
    register_response = client.post(
        "/api/devices/register",
        json={
            "machine_key": f"machine-bootstrap-{uuid.uuid4().hex[:6]}",
            "name": "Bootstrap PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 2,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    payload = register_response.json()
    device_id = payload["device"]["id"]
    machine_key = payload["worker_config"]["machine_key"]
    response = client.get(
        f"/api/devices/{device_id}/worker-config",
        headers={"X-Machine-Key": machine_key},
    )

    assert response.status_code == 200
    assert response.json()["worker_token"] == payload["worker_config"]["worker_token"]


def test_device_delete_removes_owned_device():
    headers = auth_headers()
    register_response = client.post(
        "/api/devices/register",
        headers=headers,
        json={
            "machine_key": f"machine-delete-{uuid.uuid4().hex[:6]}",
            "name": "Delete PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 2,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    device_id = register_response.json()["device"]["id"]

    delete_response = client.delete(f"/api/devices/{device_id}", headers=headers)
    list_response = client.get("/api/devices", headers=headers)

    assert delete_response.status_code == 200
    assert delete_response.json()["status"] == "deleted"
    assert list_response.status_code == 200
    assert list_response.json() == []


def test_claim_device_assigns_hidden_device_to_current_user():
    first_headers = auth_headers()
    other_user = create_user("Other User", f"other-claim-{uuid.uuid4().hex[:8]}@example.com", "12345678")
    other_headers = {"X-Session-Token": create_user_session(other_user.id)}

    register_response = client.post(
        "/api/devices/register",
        headers=first_headers,
        json={
            "machine_key": f"machine-claim-{uuid.uuid4().hex[:6]}",
            "name": "Claim PC",
            "os_version": "Windows 11 Pro",
            "exe_path": r"C:\Apps\Test\broker.exe",
            "window_count": 1,
            "health_check_interval_sec": 6,
            "reconnect_cooldown_sec": 18,
            "launch_args": [],
        },
    )
    payload = register_response.json()
    device_id = payload["device"]["id"]
    machine_key = payload["worker_config"]["machine_key"]

    claim_response = client.post(
        "/api/devices/claim",
        headers=other_headers,
        json={"device_id": device_id, "machine_key": machine_key},
    )
    other_devices = client.get("/api/devices", headers=other_headers)

    assert claim_response.status_code == 200
    assert claim_response.json()["status"] == "claimed"
    assert len(other_devices.json()) == 1
    assert other_devices.json()[0]["id"] == device_id
