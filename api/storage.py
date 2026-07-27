from __future__ import annotations

import hashlib
import json
import os
import re
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path

from api.models import (
    AuthUser,
    AutomationRules,
    DeviceConfig,
    DeviceEvent,
    DeviceStatus,
    WindowProfile,
    WorkerCommand,
    WorkerConfigPayload,
)

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover
    psycopg = None  # type: ignore
    dict_row = None  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.getenv("OTOLOGIN_DATA_DIR", str(ROOT / "data"))).resolve()
DB_PATH = DATA_DIR / "otologin.sqlite3"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def dict_factory(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict:
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


def is_postgres() -> bool:
    return DATABASE_URL.startswith("postgresql://") or DATABASE_URL.startswith("postgres://")


def adapt_query(query: str) -> str:
    if not is_postgres():
        return query
    return query.replace("?", "%s")


def execute(connection, query: str, params: tuple | list = ()):
    return connection.execute(adapt_query(query), params)


def executemany(connection, query: str, params_seq):
    if is_postgres():
        with connection.cursor() as cursor:
            return cursor.executemany(adapt_query(query), params_seq)
    return connection.executemany(adapt_query(query), params_seq)


@contextmanager
def get_connection():
    if is_postgres():
        if psycopg is None:
            raise RuntimeError("Postgres baglantisi icin psycopg kurulumu gerekli.")
        connection = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    else:
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
        statements = [
            """
            CREATE TABLE IF NOT EXISTS users (
              id TEXT PRIMARY KEY,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              password_hash TEXT NOT NULL,
              password_salt TEXT NOT NULL,
              created_at TEXT NOT NULL,
              last_login_at TEXT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
              id TEXT PRIMARY KEY,
              user_id TEXT NOT NULL,
              session_token TEXT NOT NULL UNIQUE,
              created_at TEXT NOT NULL,
              revoked_at TEXT
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS devices (
              id TEXT PRIMARY KEY,
              machine_key TEXT,
              owner_user_id TEXT,
              worker_token TEXT,
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
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS device_configs (
              device_id TEXT PRIMARY KEY,
              exe_path TEXT NOT NULL,
              launch_args TEXT NOT NULL,
              window_count INTEGER NOT NULL,
              health_check_interval_sec INTEGER NOT NULL,
              reconnect_cooldown_sec INTEGER NOT NULL,
              automation_rules TEXT NOT NULL DEFAULT '{}'
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS window_profiles (
              id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              slot INTEGER NOT NULL,
              email TEXT NOT NULL,
              credential_id TEXT NOT NULL,
              post_login_choice TEXT,
              position TEXT NOT NULL,
              last_action TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS device_events (
              id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              level TEXT NOT NULL,
              event_type TEXT NOT NULL,
              message TEXT NOT NULL,
              created_at TEXT NOT NULL
            )
            """,
            """
            CREATE TABLE IF NOT EXISTS device_commands (
              id TEXT PRIMARY KEY,
              device_id TEXT NOT NULL,
              command_type TEXT NOT NULL,
              payload TEXT NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL,
              acknowledged_at TEXT,
              note TEXT
            )
            """,
        ]
        for statement in statements:
            execute(connection, statement)
        ensure_column(connection, "devices", "machine_key", "TEXT")
        ensure_column(connection, "devices", "owner_user_id", "TEXT")
        ensure_column(connection, "devices", "worker_token", "TEXT")
        ensure_column(connection, "device_configs", "automation_rules", "TEXT NOT NULL DEFAULT '{}'")
        execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_machine_key ON devices(machine_key)")
        execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_worker_token ON devices(worker_token)")
        execute(connection, "CREATE INDEX IF NOT EXISTS idx_devices_owner_user_id ON devices(owner_user_id)")
        execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        execute(connection, "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token)")
        backfill_device_security_defaults(connection)

    remove_demo_seed_data()


def ensure_column(connection, table_name: str, column_name: str, column_definition: str) -> None:
    if is_postgres():
        columns = execute(
            connection,
            """
            SELECT column_name AS name
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ? AND column_name = ?
            """,
            (table_name, column_name),
        ).fetchall()
    else:
        columns = connection.execute(f"PRAGMA table_info({table_name})").fetchall()
    column_names = {row["name"] for row in columns}
    if column_name not in column_names:
        execute(connection, f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_definition}")


def serialize_automation_rules(rules: AutomationRules) -> str:
    return json.dumps(rules.model_dump())


def parse_automation_rules(raw: str | None) -> AutomationRules:
    if not raw:
        return AutomationRules()
    return AutomationRules(**json.loads(raw))


def remove_demo_seed_data() -> None:
    demo_ids = ("win-floor-01", "win-floor-02", "win-floor-03")
    with get_connection() as connection:
        executemany(connection, "DELETE FROM window_profiles WHERE device_id = ?", [(device_id,) for device_id in demo_ids])
        executemany(connection, "DELETE FROM device_events WHERE device_id = ?", [(device_id,) for device_id in demo_ids])
        executemany(connection, "DELETE FROM device_commands WHERE device_id = ?", [(device_id,) for device_id in demo_ids])
        executemany(connection, "DELETE FROM device_configs WHERE device_id = ?", [(device_id,) for device_id in demo_ids])
        executemany(
            connection,
            "DELETE FROM devices WHERE id = ? OR name = ?",
            [(device_id, name) for device_id, name in zip(demo_ids, ("Borsa PC 01", "Borsa PC 02", "Borsa PC 03"))],
        )


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), 120000).hex()


def generate_worker_token() -> str:
    return secrets.token_urlsafe(32)


def get_default_owner_user_id(connection) -> str | None:
    row = execute(
        connection,
        "SELECT id FROM users ORDER BY created_at ASC LIMIT 1",
    ).fetchone()
    return row["id"] if row else None


def backfill_device_security_defaults(connection) -> None:
    default_owner_user_id = get_default_owner_user_id(connection)
    device_rows = execute(connection, "SELECT id, owner_user_id, worker_token FROM devices").fetchall()

    for row in device_rows:
        updates: list[str] = []
        params: list[str] = []

        if not row.get("worker_token"):
            updates.append("worker_token = ?")
            params.append(generate_worker_token())

        if default_owner_user_id and not row.get("owner_user_id"):
            updates.append("owner_user_id = ?")
            params.append(default_owner_user_id)

        if updates:
            params.append(row["id"])
            execute(connection, f"UPDATE devices SET {', '.join(updates)} WHERE id = ?", tuple(params))


def count_users() -> int:
    with get_connection() as connection:
        return int(execute(connection, "SELECT COUNT(*) AS total FROM users").fetchone()["total"])


def create_user(name: str, email: str, password: str) -> AuthUser:
    user_id = str(uuid.uuid4())
    salt = secrets.token_hex(16)
    normalized_email = _normalize_email(email)
    created_at = utc_now()

    with get_connection() as connection:
        existing = execute(
            connection,
            "SELECT id FROM users WHERE email = ?",
            (normalized_email,),
        ).fetchone()
        if existing:
            raise ValueError("Bu e-posta ile kayitli bir hesap zaten var.")
        execute(
            connection,
            """
            INSERT INTO users (id, name, email, password_hash, password_salt, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, name.strip(), normalized_email, _hash_password(password, salt), salt, created_at),
        )
        execute(
            connection,
            "UPDATE devices SET owner_user_id = ? WHERE owner_user_id IS NULL OR owner_user_id = ''",
            (user_id,),
        )

    return get_user_by_id(user_id)


def get_user_by_id(user_id: str) -> AuthUser | None:
    with get_connection() as connection:
        row = execute(
            connection,
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    if not row:
        return None
    return AuthUser(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def authenticate_user(email: str, password: str) -> AuthUser | None:
    normalized_email = _normalize_email(email)
    with get_connection() as connection:
        row = execute(
            connection,
            "SELECT * FROM users WHERE email = ?",
            (normalized_email,),
        ).fetchone()
        if not row:
            return None
        password_hash = _hash_password(password, row["password_salt"])
        if password_hash != row["password_hash"]:
            return None
        execute(
            connection,
            "UPDATE users SET last_login_at = ? WHERE id = ?",
            (utc_now(), row["id"]),
        )
    return get_user_by_id(row["id"])


def create_user_session(user_id: str) -> str:
    session_id = str(uuid.uuid4())
    session_token = secrets.token_urlsafe(32)
    with get_connection() as connection:
        execute(
            connection,
            """
            INSERT INTO user_sessions (id, user_id, session_token, created_at, revoked_at)
            VALUES (?, ?, ?, ?, NULL)
            """,
            (session_id, user_id, session_token, utc_now()),
        )
    return session_token


def get_user_by_session_token(session_token: str) -> AuthUser | None:
    with get_connection() as connection:
        row = execute(
            connection,
            """
            SELECT u.id, u.name, u.email, u.created_at
            FROM user_sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.session_token = ? AND s.revoked_at IS NULL
            """,
            (session_token,),
        ).fetchone()
    if not row:
        return None
    return AuthUser(
        id=row["id"],
        name=row["name"],
        email=row["email"],
        created_at=datetime.fromisoformat(row["created_at"]),
    )


def revoke_session(session_token: str) -> None:
    with get_connection() as connection:
        execute(
            connection,
            "UPDATE user_sessions SET revoked_at = ? WHERE session_token = ? AND revoked_at IS NULL",
            (utc_now(), session_token),
        )


def list_devices(owner_user_id: str | None = None) -> list[DeviceStatus]:
    with get_connection() as connection:
        if owner_user_id:
            rows = execute(
                connection,
                "SELECT * FROM devices WHERE owner_user_id = ? ORDER BY name",
                (owner_user_id,),
            ).fetchall()
        else:
            rows = execute(connection, "SELECT * FROM devices ORDER BY name").fetchall()
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


def get_device(device_id: str, owner_user_id: str | None = None) -> DeviceStatus | None:
    with get_connection() as connection:
        if owner_user_id:
            row = execute(
                connection,
                "SELECT * FROM devices WHERE id = ? AND owner_user_id = ?",
                (device_id, owner_user_id),
            ).fetchone()
        else:
            row = execute(connection, "SELECT * FROM devices WHERE id = ?", (device_id,)).fetchone()
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


def get_device_config(device_id: str, owner_user_id: str | None = None) -> DeviceConfig | None:
    with get_connection() as connection:
        if owner_user_id:
            config_row = execute(
                connection,
                """
                SELECT c.*
                FROM device_configs c
                JOIN devices d ON d.id = c.device_id
                WHERE c.device_id = ? AND d.owner_user_id = ?
                """,
                (device_id, owner_user_id),
            ).fetchone()
        else:
            config_row = execute(
                connection,
                "SELECT * FROM device_configs WHERE device_id = ?",
                (device_id,),
            ).fetchone()
        if not config_row:
            return None
        profile_rows = execute(
            connection,
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
        automation_rules=parse_automation_rules(config_row.get("automation_rules")),
        profiles=profiles,
    )


def update_device_config(device_id: str, config: DeviceConfig) -> None:
    with get_connection() as connection:
        execute(
            connection,
            """
            INSERT INTO device_configs
            (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec, automation_rules)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(device_id) DO UPDATE SET
              exe_path = excluded.exe_path,
              launch_args = excluded.launch_args,
              window_count = excluded.window_count,
              health_check_interval_sec = excluded.health_check_interval_sec,
              reconnect_cooldown_sec = excluded.reconnect_cooldown_sec,
              automation_rules = excluded.automation_rules
            """,
            (
                device_id,
                config.exe_path,
                json.dumps(config.launch_args),
                config.window_count,
                config.health_check_interval_sec,
                config.reconnect_cooldown_sec,
                serialize_automation_rules(config.automation_rules),
            ),
        )
        execute(
            connection,
            "UPDATE devices SET exe_path = ? WHERE id = ?",
            (config.exe_path, device_id),
        )
        execute(connection, "DELETE FROM window_profiles WHERE device_id = ?", (device_id,))
        if config.profiles:
            executemany(
                connection,
                """
                INSERT INTO window_profiles
                (id, device_id, slot, email, credential_id, post_login_choice, position, last_action)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        profile.id,
                        profile.device_id,
                        profile.slot,
                        profile.email,
                        profile.credential_id,
                        profile.post_login_choice,
                        profile.position,
                        profile.last_action,
                    )
                    for profile in config.profiles
                ],
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
    owner_user_id: str | None = None,
) -> tuple[DeviceStatus, DeviceConfig]:
    launch_args = launch_args or []

    with get_connection() as connection:
        effective_owner_user_id = owner_user_id or get_default_owner_user_id(connection)
        existing = None
        if machine_key:
            existing = execute(
                connection,
                "SELECT id, owner_user_id, worker_token FROM devices WHERE machine_key = ?",
                (machine_key,),
            ).fetchone()

        if existing:
            device_id = existing["id"]
            current_owner_user_id = existing.get("owner_user_id")
            if owner_user_id and current_owner_user_id and current_owner_user_id != owner_user_id:
                raise ValueError("Bu cihaz baska bir hesaba bagli.")

            worker_token = existing.get("worker_token") or generate_worker_token()
            next_owner_user_id = current_owner_user_id or effective_owner_user_id
            execute(
                connection,
                """
                UPDATE devices
                SET machine_key = ?, owner_user_id = ?, worker_token = ?, name = ?, os_version = ?, exe_path = ?
                WHERE id = ?
                """,
                (machine_key, next_owner_user_id, worker_token, name, os_version, exe_path, device_id),
            )
            execute(
                connection,
                """
                INSERT INTO device_configs
                (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec, automation_rules)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                  exe_path = excluded.exe_path,
                  launch_args = excluded.launch_args,
                  window_count = excluded.window_count,
                  health_check_interval_sec = excluded.health_check_interval_sec,
                  reconnect_cooldown_sec = excluded.reconnect_cooldown_sec,
                  automation_rules = excluded.automation_rules
                """,
                (
                    device_id,
                    exe_path,
                    json.dumps(launch_args),
                    window_count,
                    health_check_interval_sec,
                    reconnect_cooldown_sec,
                    serialize_automation_rules(AutomationRules()),
                ),
            )
        else:
            safe_name = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "win-device"
            device_id = f"{safe_name[:20]}-{uuid.uuid4().hex[:6]}"
            worker_token = generate_worker_token()
            execute(
                connection,
                """
                INSERT INTO devices
                (id, machine_key, owner_user_id, worker_token, name, os_version, online, internet_reachable, last_heartbeat_at, automation_state, last_error, active_windows, exe_path, retries_today)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    device_id,
                    machine_key,
                    effective_owner_user_id,
                    worker_token,
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
            execute(
                connection,
                """
                INSERT INTO device_configs
                (device_id, exe_path, launch_args, window_count, health_check_interval_sec, reconnect_cooldown_sec, automation_rules)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    device_id,
                    exe_path,
                    json.dumps(launch_args),
                    window_count,
                    health_check_interval_sec,
                    reconnect_cooldown_sec,
                    serialize_automation_rules(AutomationRules()),
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
        machine_key_row = execute(
            connection,
            "SELECT machine_key, worker_token FROM devices WHERE id = ?",
            (config.device_id,),
        ).fetchone()
    return WorkerConfigPayload(
        api_base_url=api_base_url.rstrip("/"),
        device_id=config.device_id,
        machine_key=machine_key_row["machine_key"] if machine_key_row else None,
        worker_token=machine_key_row["worker_token"] if machine_key_row else None,
        window_count=config.window_count,
        health_check_interval_sec=config.health_check_interval_sec,
        reconnect_cooldown_sec=config.reconnect_cooldown_sec,
        exe_path=config.exe_path,
        launch_args=config.launch_args,
        automation_rules=config.automation_rules,
        profiles=config.profiles,
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
        execute(
            connection,
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


def list_events(limit: int = 50, owner_user_id: str | None = None) -> list[DeviceEvent]:
    with get_connection() as connection:
        if owner_user_id:
            rows = execute(
                connection,
                """
                SELECT e.*
                FROM device_events e
                JOIN devices d ON d.id = e.device_id
                WHERE d.owner_user_id = ?
                ORDER BY e.created_at DESC
                LIMIT ?
                """,
                (owner_user_id, limit),
            ).fetchall()
        else:
            rows = execute(
                connection,
                "SELECT * FROM device_events ORDER BY created_at DESC LIMIT ?",
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
        execute(
            connection,
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


def enqueue_command(device_id: str, command_type: str, payload: dict | None = None) -> WorkerCommand:
    command = WorkerCommand(
        id=str(uuid.uuid4()),
        device_id=device_id,
        command_type=command_type,
        payload=payload or {},
        created_at=datetime.now(timezone.utc),
    )
    with get_connection() as connection:
        execute(
            connection,
            """
            INSERT INTO device_commands (id, device_id, command_type, payload, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                command.id,
                command.device_id,
                command.command_type,
                json.dumps(command.payload),
                "queued",
                command.created_at.isoformat(),
            ),
        )
    return command


def list_pending_commands(device_id: str, limit: int = 20) -> list[WorkerCommand]:
    with get_connection() as connection:
        rows = execute(
            connection,
            """
            SELECT * FROM device_commands
            WHERE device_id = ? AND status = 'queued'
            ORDER BY created_at ASC
            LIMIT ?
            """,
            (device_id, limit),
        ).fetchall()
    return [
        WorkerCommand(
            id=row["id"],
            device_id=row["device_id"],
            command_type=row["command_type"],
            payload=json.loads(row["payload"]),
            created_at=datetime.fromisoformat(row["created_at"]),
        )
        for row in rows
    ]


def acknowledge_command(command_id: str, status: str, note: str | None = None) -> None:
    with get_connection() as connection:
        execute(
            connection,
            """
            UPDATE device_commands
            SET status = ?, note = ?, acknowledged_at = ?
            WHERE id = ?
            """,
            (status, note, utc_now(), command_id),
        )


def delete_device(device_id: str) -> None:
    with get_connection() as connection:
        execute(connection, "DELETE FROM window_profiles WHERE device_id = ?", (device_id,))
        execute(connection, "DELETE FROM device_events WHERE device_id = ?", (device_id,))
        execute(connection, "DELETE FROM device_commands WHERE device_id = ?", (device_id,))
        execute(connection, "DELETE FROM device_configs WHERE device_id = ?", (device_id,))
        execute(connection, "DELETE FROM devices WHERE id = ?", (device_id,))


def get_worker_token(device_id: str) -> str | None:
    with get_connection() as connection:
        row = execute(connection, "SELECT worker_token FROM devices WHERE id = ?", (device_id,)).fetchone()
    if not row:
        return None
    return row["worker_token"]


def get_device_machine_key(device_id: str) -> str | None:
    with get_connection() as connection:
        row = execute(connection, "SELECT machine_key FROM devices WHERE id = ?", (device_id,)).fetchone()
    if not row:
        return None
    return row["machine_key"]


def get_command_device_id(command_id: str) -> str | None:
    with get_connection() as connection:
        row = execute(connection, "SELECT device_id FROM device_commands WHERE id = ?", (command_id,)).fetchone()
    if not row:
        return None
    return row["device_id"]
