import json

from worker.config import WorkerConfig, load_worker_config


def test_load_worker_config_returns_defaults_for_missing_file(tmp_path):
    config = load_worker_config(str(tmp_path / "missing.json"))

    assert config == WorkerConfig()


def test_load_worker_config_reads_json_values(tmp_path):
    config_path = tmp_path / "worker-config.json"
    config_path.write_text(
        json.dumps(
            {
                "api_base_url": "https://panel.example.com",
                "device_id": "win-floor-09",
                "health_check_interval_sec": 12,
                "reconnect_cooldown_sec": 31,
                "exe_path": r"D:\\Broker\\app.exe",
                "launch_args": ["--headless-check"],
            }
        ),
        encoding="utf-8",
    )

    config = load_worker_config(str(config_path))

    assert config.api_base_url == "https://panel.example.com"
    assert config.device_id == "win-floor-09"
    assert config.health_check_interval_sec == 12
    assert config.reconnect_cooldown_sec == 31
    assert config.exe_path == r"D:\\Broker\\app.exe"
    assert config.launch_args == ["--headless-check"]
