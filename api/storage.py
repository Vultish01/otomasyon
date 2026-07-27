from __future__ import annotations

import json
import re
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from api.models import DeviceConfig, DeviceEvent, DeviceStatus, WindowProfile, WorkerConfigPayload

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "otologin.sqlite3"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def dict_factory(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict:
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


@contextmanager
def get_connection():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = dict_factory
    try:
        yield connection
        connection.commit()
    finally:
        connection.close()


def initialize_database() -> None:
    with get_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS devices (
              id TEXT PRIMARY KEY,
              machine_key TEXT,
              name TEXT NOT NULL,
              os_version TEXT NOT NULL,
              online INTEGER NOT NULL DEFAULT 1,
              internet_reachable INTEGER NOT NULL DEFAULT 1,
              last_heartbeat_at TEXT NOT NULL,
              automation_state TEXT NOT NULL,
              last_error TEXT,
              active_windows INTEGER NOT NULL,
              exe_path TEXT NOT NULL,
              retries_today INTEGER NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS device_configs (
              device_id TEXT PRIMARY KEY,
              exe_path TEXT NOT NULL,
              launch_args TEXT NOT NULL,
              window_count INTEGER NOT NULL,
              health_check_interval_sec INTEGER NOT NULL,
              reconnect_cooldown_sec INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS window_profiles (
              id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              slot INTEGER NOT NULL,
              email TEXT NOT NULL,
              credential_id TEXT NOT NULL,
              post_login_choice TEXT,
              position TEXT NOT NULL,
              last_action TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS device_events (
              id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              level TEXT NOT NULL,
              event_type TEXT NOT NULL,
              message TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )
        ensure_column(connection, "devices", "machine_key", "TEXT")
        connection.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_machine_key ON devices(machine_key)"
        )

    seed_database()


def ensure_column(connection: sqlite3.Connection, table_name: str, column_name: str, column_definition: str) -> None:
    columns = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    column_names = {row["name"] for row in columns}
    if column_name not in column_names:
        connection.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def seed_database() -> None:
    with get_connection() as connection:
        current = connection.execute("SELECT COUNT(*) AS total FROM devices").fetchone()["total"]
        if current:
            return

        devices = [
            DeviceStatus(
                id="win-floor-01",
                name="Borsa PC 01",
                os_version="Windows 11 Pro",
                last_heartbeat_at=datetime.fromisoformat("2026-07-27T02:50:00+00:00"),
                automation_state="idle",
                active_windows=4,
                exe_path=r"C:\Apps\BrokerDesk\broker.exe",
                retries_today=1,
            ),
            DeviceStatus(
                id="win-floor-02",
                name="Borsa PC 02",
                os_version="Windows 10 Pro",
                internet_reachable=False,
                last_heartbeat_at=datetime.fromisoformat("2026-07-27T02:47:00+00:00"),
                automation_state="checking",
                active_windows=2,
                exe_path=r"D:\Trading\broker.exe",
                retries_today=4,
                last_error="Internet geri gelmedi, worker beklemede.",
            ),
            DeviceStatus(
                id="win-floor-03",
                name="Borsa PC 03",
                os_version="Windows 10 Home",
                last_heartbeat_at=datetime.fromisoformat("2026-07-27T02:49:10+00:00"),
                automation_state="logging_in",
                active_windows=3,
                exe_path=r"C:\Legacy\broker.exe",
                retries_today=2,
            ),
        ]

        configs = [
            DeviceConfig(
                device_id="win-floor-01",
                exe_path=r"C:\Apps\BrokerDesk\broker.exe",
                profiles=[
                    WindowProfile(
                        id="wf01-p1",
                        device_id="win-floor-01",
                        slot=1,
                        email="hesap-a@example.com",
                        credential_id="cred-hesap-a",
                        post_login_choice="Secenek A",
                        position="top_left",
                    ),
                    WindowProfile(
                        id="wf01-p2",
                        device_id="win-floor-01",
                        slot=2,
                        email="hesap-a@example.com",
                        credential_id="cred-hesap-a",
                        post_login_choice="Secenek B",
                        position="top_right",
                        last_action="Secim ekrani dogrulandi",
                    ),
                    WindowProfile(
                        id="wf01-p3",
                        device_id="win-floor-01",
                        slot=3,
                        email="hesap-b@example.com",
                        credential_id="cred-hesap-b",
                        post_login_choice="Secenek A",
                        position="bottom_left",
                        last_action="Pencere hizalandi",
                    ),
                    WindowProfile(
                        id="wf01-p4",
                        device_id="win-floor-01",
                        slot=4,
                        email="hesap-b@example.com",
                        credential_id="cred-hesap-b",
                        post_login_choice="Secenek B",
                        position="bottom_right",
                    ),
                ],
            ),
            DeviceConfig(
                device_id="win-floor-02",
                exe_path=r"D:\Trading\broker.exe",
                health_check_interval_sec=10,
                reconnect_cooldown_sec=25,
            ),
            DeviceConfig(
                device_id="win-floor-03",
                exe_path=r"C:\Legacy\broker.exe",
                launch_args=["--legacy-render"],
                health_check_interval_sec=8,
                reconnect_cooldown_sec=20,
            ),
        ]

        events = [
            DeviceEvent(
                id="evt-1",
                device_id="win-floor-03",
                level="warning",
                event_type="logout_detected",
                message="Pencere 3 ana ekran yerine login ekranina dustu.",
                created_at=datetime.fromisoformat("2026-07-27T02:48:04+00:00"),
            ),
            DeviceEvent(
                id="evt-2",
                device_id="win-floor-03",
                level="info",
                event_type="restart_started",
                message="Eski pencere kapatildi, EXE yeniden baslatildi.",
                created_at=datetime.fromisoformat("2026-07-27T02:48:40+00:00"),
            ),
        ]

        connection.executemany(
            """
            INSERT INTO devices
            (id, name, os_version, online, internet_reachable, last_heartbeat_at, automation_state, last_error, active_windows, exe_path, retries_today)
            VALUES (:id, :name, :os_version, :online, :internet_reachable, :last_heartbeat_at, :automation_state, :last_error, :active_windows, :exe_path, :retries_today)
            """,
            [
                {
                    **device.model_dump(),
                    "online": int(device.online),
                    "internet_reachable": int(device.internet_reachable),
                    "last_heartbeat_at": device.last_heartbeat_at.isoformat(),
                }
                for device in devices
            ],
        )

        connection.executemany(
            """
            INSERT INTO device_configs
            (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec)
            VALUES (:device_id, :exe_path, :launch_args, :window_count, :health_check_interval_sec, :reconnect_cooldown_sec)
            """,
            [
                {
                    "device_id": config.device_id,
                    "exe_path": config.exe_path,
                    "launch_args": json.dumps(config.launch_args),
                    "window_count": config.window_count,
                    "health_check_interval_sec": config.health_check_interval_sec,
                    "reconnect_cooldown_sec": config.reconnect_cooldown_sec,
                }
                for config in configs
            ],
        )

        for config in configs:
            if not config.profiles:
                continue
            connection.executemany(
                """
                INSERT INTO window_profiles
                (id, device_id, slot, email, credential_id, post_login_choice, position, last_action)
                VALUES (:id, :device_id, :slot, :email, :credential_id, :post_login_choice, :position, :last_action)
                """,
                [profile.model_dump() for profile in config.profiles],
            )

        connection.executemany(
            """
            INSERT INTO device_events (id, device_id, level, event_type, message, created_at)
            VALUES (:id, :device_id, :level, :event_type, :message, :created_at)
            """,
            [{**event.model_dump(), "created_at": event.created_at.isoformat()} for event in events],
        )


def list_devices() -> list[DeviceStatus]:
    with get_connection() as connection:
        rows = connection.execute("SELECT * FROM devices ORDER BY name").fetchall()
    return [
        DeviceStatus(
            **{
                **{key: value for key, value in row.items() if key != "machine_key"},
                "online": bool(row["online"]),
                "internet_reachable": bool(row["internet_reachable"]),
                "last_heartbeat_at": datetime.fromisoformat(row["last_heartbeat_at"]),
            }
        )
        for row in rows
    ]


def get_device(device_id: str) -> DeviceStatus | None:
    with get_connection() as connection:
        row = connection.execute("SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
    if not row:
        return None
    return DeviceStatus(
        **{
            **{key: value for key, value in row.items() if key != "machine_key"},
            "online": bool(row["online"]),
            "internet_reachable": bool(row["internet_reachable"]),
            "last_heartbeat_at": datetime.fromisoformat(row["last_heartbeat_at"]),
        }
    )


def get_device_config(device_id: str) -> DeviceConfig | None:
    with get_connection() as connection:
        config_row = connection.execute(
            "SELECT * FROM device_configs WHERE device_id = ?",
            (device_id,),
        ).fetchone()
        if not config_row:
            return None
        profile_rows = connection.execute(
            "SELECT * FROM window_profiles WHERE device_id = ? ORDER BY slot",
            (device_id,),
        ).fetchall()

    profiles = [WindowProfile(**row) for row in profile_rows]
    return DeviceConfig(
        device_id=config_row["device_id"],
        exe_path=config_row["exe_path"],
        launch_args=json.loads(config_row["launch_args"]),
        window_count=config_row["window_count"],
        health_check_interval_sec=config_row["health_check_interval_sec"],
        reconnect_cooldown_sec=config_row["reconnect_cooldown_sec"],
        profiles=profiles,
    )


def update_device_config(device_id: str, config: DeviceConfig) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO device_configs
            (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
              exe_path = excluded.exe_path,
              launch_args = excluded.launch_args,
              window_count = excluded.window_count,
              health_check_interval_sec = excluded.health_check_interval_sec,
              reconnect_cooldown_sec = excluded.reconnect_cooldown_sec
            """,
            (
                device_id,
                config.exe_path,
                json.dumps(config.launch_args),
                config.window_count,
                config.health_check_interval_sec,
                config.reconnect_cooldown_sec,
            ),
        )
        connection.execute(
            "UPDATE devices SET exe_path = ? WHERE id = ?",
            (config.exe_path, device_id),
        )
        connection.execute("DELETE FROM window_profiles WHERE device_id = ?", (device_id,))
        if config.profiles:
            connection.executemany(
                """
                INSERT INTO window_profiles
                (id, device_id, slot, email, credential_id, post_login_choice, position, last_action)
                VALUES (:id, :device_id, :slot, :email, :credential_id, :post_login_choice, :position, :last_action)
                """,
                [profile.model_dump() for profile in config.profiles],
            )


def create_device(
    machine_key: str | None,
    name: str,
    os_version: str,
    exe_path: str,
    window_count: int,
    health_check_interval_sec: int,
    reconnect_cooldown_sec: int,
    launch_args: list[str] | None = None,
) -> tuple[DeviceStatus, DeviceConfig]:
    launch_args = launch_args or []

    with get_connection() as connection:
        existing = None
        if machine_key:
            existing = connection.execute(
                "SELECT id FROM devices WHERE machine_key = ?",
                (machine_key,),
            ).fetchone()

        if existing:
            device_id = existing["id"]
            connection.execute(
                """
                UPDATE devices
                SET machine_key = ?, name = ?, os_version = ?, exe_path = ?
                WHERE id = ?
                """,
                (machine_key, name, os_version, exe_path, device_id),
            )
            connection.execute(
                """
                INSERT INTO device_configs
                (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                  exe_path = excluded.exe_path,
                  launch_args = excluded.launch_args,
                  window_count = excluded.window_count,
                  health_check_interval_sec = excluded.health_check_interval_sec,
                  reconnect_cooldown_sec = excluded.reconnect_cooldown_sec
                """,
                (
                    device_id,
                    exe_path,
                    json.dumps(launch_args),
                    window_count,
                    health_check_interval_sec,
                    reconnect_cooldown_sec,
                ),
            )
        else:
            safe_name = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "win-device"
            device_id = f"{safe_name[:20]}-{uuid.uuid4().hex[:6]}"
            connection.execute(
                """
                INSERT INTO devices
                (id, machine_key, name, os_version, online, internet_reachable, last_heartbeat_at, automation_state, last_error, active_windows, exe_path, retries_today)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    device_id,
                    machine_key,
                    name,
                    os_version,
                    0,
                    0,
                    datetime.now(timezone.utc).isoformat(),
                    "idle",
                    None,
                    0,
                    exe_path,
                    0,
                ),
            )
            connection.execute(
                """
                INSERT INTO device_configs
                (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    device_id,
                    exe_path,
                    json.dumps(launch_args),
                    window_count,
                    health_check_interval_sec,
                    reconnect_cooldown_sec,
                ),
            )

    device = get_device(device_id)
    config = get_device_config(device_id)
    if not device or not config:
        raise RuntimeError("Yeni cihaz kaydi olusturulamadi.")

    return device, config


def build_worker_config_payload(api_base_url: str, config: DeviceConfig) -> WorkerConfigPayload:
    machine_key_row = None
    with get_connection() as connection:
        machine_key_row = connection.execute(
            "SELECT machine_key FROM devices WHERE id = ?",
            (config.device_id,),
        ).fetchone()
    return WorkerConfigPayload(
        api_base_url=api_base_url.rstrip("/"),
        device_id=config.device_id,
        machine_key=machine_key_row["machine_key"] if machine_key_row else None,
        window_count=config.window_count,
        health_check_interval_sec=config.health_check_interval_sec,
        reconnect_cooldown_sec=config.reconnect_cooldown_sec,
        exe_path=config.exe_path,
        launch_args=config.launch_args,
    )


def add_event(device_id: str, level: str, event_type: str, message: str) -> DeviceEvent:
    event = DeviceEvent(
        id=str(uuid.uuid4()),
        device_id=device_id,
        level=level,
        event_type=event_type,
        message=message,
        created_at=datetime.now(timezone.utc),
    )
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO device_events (id, device_id, level, event_type, message, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                event.id,
                event.device_id,
                event.level,
                event.event_type,
                event.message,
                event.created_at.isoformat(),
            ),
        )
    return event


def list_events(limit: int = 50) -> list[DeviceEvent]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM device_events ORDER BY datetime(created_at) DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [DeviceEvent(**{**row, "created_at": datetime.fromisoformat(row["created_at"])}) for row in rows]


def update_heartbeat(
    device_id: str,
    online: bool,
    internet_reachable: bool,
    automation_state: str,
    active_windows: int,
    last_error: str | None,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            UPDATE devices
            SET online = ?, internet_reachable = ?, automation_state = ?, active_windows = ?, last_error = ?, last_heartbeat_at = ?
            WHERE id = ?
            """,
            (
                int(online),
                int(internet_reachable),
                automation_state,
                active_windows,
                last_error,
                utc_now(),
                device_id,
            ),
        )
