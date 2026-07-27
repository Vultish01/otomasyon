import json

from worker.config import AutomationRules, HelperAutomation, WorkerConfig, load_worker_config, merge_worker_config, save_worker_config


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
                "machine_key": "machine-09",
                "window_count": 3,
                "health_check_interval_sec": 12,
                "reconnect_cooldown_sec": 31,
                "exe_path": r"D:\\Broker\\app.exe",
                "launch_args": ["--headless-check"],
                "automation_rules": {
                    "pre_login_hotkey_enabled": True,
                    "pre_login_hotkey": "CTRL+ALT+L",
                    "helper_automation": {
                        "enabled": True,
                        "program_path": r"C:\\Helper\\helper.exe",
                        "launch_args": ["--demo"],
                        "trigger": "hotkey",
                        "hotkey": "CTRL+SHIFT+R",
                        "click_x": 320,
                        "click_y": 240,
                        "click_button": "left",
                        "wait_after_launch_sec": 5,
                    },
                },
            }
        ),
        encoding="utf-8",
    )

    config = load_worker_config(str(config_path))

    assert config.api_base_url == "https://panel.example.com"
    assert config.device_id == "win-floor-09"
    assert config.machine_key == "machine-09"
    assert config.window_count == 3
    assert config.health_check_interval_sec == 12
    assert config.reconnect_cooldown_sec == 31
    assert config.exe_path == r"D:\\Broker\\app.exe"
    assert config.launch_args == ["--headless-check"]
    assert config.automation_rules.pre_login_hotkey_enabled is True
    assert config.automation_rules.helper_automation.program_path == r"C:\\Helper\\helper.exe"


def test_load_worker_config_accepts_utf8_bom(tmp_path):
    config_path = tmp_path / "worker-config.json"
    config_path.write_text(
        json.dumps(
            {
                "api_base_url": "https://panel.example.com",
                "device_id": "win-bom-01",
                "machine_key": "machine-bom-01",
            }
        ),
        encoding="utf-8-sig",
    )

    config = load_worker_config(str(config_path))

    assert config.api_base_url == "https://panel.example.com"
    assert config.device_id == "win-bom-01"
    assert config.machine_key == "machine-bom-01"


def test_merge_worker_config_applies_remote_values():
    current = WorkerConfig(device_id="win-floor-01", window_count=4, exe_path=r"C:\\Apps\\broker.exe")
    merged = merge_worker_config(
        current,
        {
            "device_id": "win-floor-01",
            "machine_key": "machine-01",
            "window_count": 2,
            "health_check_interval_sec": 9,
            "reconnect_cooldown_sec": 20,
            "exe_path": r"D:\\Updated\\broker.exe",
            "launch_args": ["--demo"],
            "automation_rules": {
                "pre_login_hotkey_enabled": True,
                "pre_login_hotkey": "F5",
                "helper_automation": {
                    "enabled": True,
                    "program_path": r"C:\\Helper\\helper.exe",
                    "launch_args": [],
                    "trigger": "click",
                    "hotkey": "",
                    "click_x": 15,
                    "click_y": 30,
                    "click_button": "left",
                    "wait_after_launch_sec": 2,
                },
            },
        },
    )

    assert merged.machine_key == "machine-01"
    assert merged.window_count == 2
    assert merged.health_check_interval_sec == 9
    assert merged.exe_path == r"D:\\Updated\\broker.exe"
    assert merged.launch_args == ["--demo"]
    assert merged.automation_rules.pre_login_hotkey == "F5"
    assert merged.automation_rules.helper_automation.trigger == "click"


def test_save_worker_config_writes_new_fields(tmp_path):
    config_path = tmp_path / "worker-config.json"
    save_worker_config(
        WorkerConfig(
            api_base_url="https://panel.example.com",
            device_id="win-floor-04",
            machine_key="machine-04",
            window_count=2,
            exe_path=r"E:\\Broker\\app.exe",
            automation_rules=AutomationRules(
                pre_login_hotkey_enabled=True,
                pre_login_hotkey="CTRL+ALT+L",
                helper_automation=HelperAutomation(
                    enabled=True,
                    program_path=r"C:\\Helper\\helper.exe",
                    trigger="hotkey",
                    hotkey="CTRL+SHIFT+R",
                ),
            ),
        ),
        str(config_path),
    )

    payload = json.loads(config_path.read_text(encoding="utf-8"))
    assert payload["machine_key"] == "machine-04"
    assert payload["window_count"] == 2
    assert payload["automation_rules"]["pre_login_hotkey"] == "CTRL+ALT+L"
    assert payload["automation_rules"]["helper_automation"]["program_path"] == r"C:\\Helper\\helper.exe"
