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
