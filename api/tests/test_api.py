from fastapi.testclient import TestClient

from api.main import app


client = TestClient(app)


def test_healthcheck():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_devices_endpoint_returns_seeded_devices():
    response = client.get("/api/devices")
    assert response.status_code == 200
    payload = response.json()
    assert len(payload) >= 3
    assert payload[0]["id"].startswith("win-floor")


def test_worker_event_creates_log_entry():
    response = client.post(
        "/api/workers/events",
        json={
            "device_id": "win-floor-01",
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
    device_id = client.get("/api/devices").json()[0]["id"]
    response = client.get(f"/api/devices/{device_id}/worker-config")
    assert response.status_code == 200
    payload = response.json()
    assert payload["device_id"] == device_id
    assert "exe_path" in payload
