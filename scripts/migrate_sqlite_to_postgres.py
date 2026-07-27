#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import sqlite3
import sys
from pathlib import Path


TABLES = [
    "users",
    "user_sessions",
    "devices",
    "device_configs",
    "window_profiles",
    "device_events",
    "device_commands",
]

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def dict_factory(cursor: sqlite3.Cursor, row: sqlite3.Row) -> dict:
    return {column[0]: row[index] for index, column in enumerate(cursor.description)}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="SQLite verisini Supabase/Postgres veritabanina tasir."
    )
    parser.add_argument(
        "--sqlite-path",
        default=str(ROOT / "data" / "otologin.sqlite3"),
        help="Kaynak SQLite dosya yolu",
    )
    parser.add_argument(
        "--database-url",
        default=os.getenv("DATABASE_URL", ""),
        help="Hedef Postgres baglanti metni. Verilmezse DATABASE_URL kullanilir.",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Tasima oncesi hedef tablolari temizler.",
    )
    return parser.parse_args()


def load_sqlite_rows(sqlite_path: Path) -> dict[str, list[dict]]:
    if not sqlite_path.exists():
        raise FileNotFoundError(f"SQLite dosyasi bulunamadi: {sqlite_path}")

    connection = sqlite3.connect(sqlite_path)
    connection.row_factory = dict_factory
    try:
        payload: dict[str, list[dict]] = {}
        for table_name in TABLES:
            payload[table_name] = connection.execute(f"SELECT * FROM {table_name}").fetchall()
        return payload
    finally:
        connection.close()


def main() -> None:
    args = parse_args()
    database_url = args.database_url.strip()
    if not database_url:
        raise SystemExit("DATABASE_URL gerekli. Supabase Postgres baglanti metnini ver.")

    sqlite_path = Path(args.sqlite_path).expanduser().resolve()
    rows_by_table = load_sqlite_rows(sqlite_path)

    os.environ["DATABASE_URL"] = database_url
    from api.storage import get_connection, initialize_database  # noqa: WPS433

    initialize_database()

    with get_connection() as connection:
        if args.truncate:
            for table_name in reversed(TABLES):
                connection.execute(f"TRUNCATE TABLE {table_name} CASCADE")

        for row in rows_by_table["users"]:
            connection.execute(
                """
                INSERT INTO users (id, name, email, password_hash, password_salt, created_at, last_login_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  name = EXCLUDED.name,
                  email = EXCLUDED.email,
                  password_hash = EXCLUDED.password_hash,
                  password_salt = EXCLUDED.password_salt,
                  created_at = EXCLUDED.created_at,
                  last_login_at = EXCLUDED.last_login_at
                """,
                (
                    row["id"],
                    row["name"],
                    row["email"],
                    row["password_hash"],
                    row["password_salt"],
                    row["created_at"],
                    row["last_login_at"],
                ),
            )

        for row in rows_by_table["user_sessions"]:
            connection.execute(
                """
                INSERT INTO user_sessions (id, user_id, session_token, created_at, revoked_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  user_id = EXCLUDED.user_id,
                  session_token = EXCLUDED.session_token,
                  created_at = EXCLUDED.created_at,
                  revoked_at = EXCLUDED.revoked_at
                """,
                (
                    row["id"],
                    row["user_id"],
                    row["session_token"],
                    row["created_at"],
                    row["revoked_at"],
                ),
            )

        for row in rows_by_table["devices"]:
            connection.execute(
                """
                INSERT INTO devices (
                  id, machine_key, name, os_version, online, internet_reachable, last_heartbeat_at,
                  automation_state, last_error, active_windows, exe_path, retries_today
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  machine_key = EXCLUDED.machine_key,
                  name = EXCLUDED.name,
                  os_version = EXCLUDED.os_version,
                  online = EXCLUDED.online,
                  internet_reachable = EXCLUDED.internet_reachable,
                  last_heartbeat_at = EXCLUDED.last_heartbeat_at,
                  automation_state = EXCLUDED.automation_state,
                  last_error = EXCLUDED.last_error,
                  active_windows = EXCLUDED.active_windows,
                  exe_path = EXCLUDED.exe_path,
                  retries_today = EXCLUDED.retries_today
                """,
                (
                    row["id"],
                    row["machine_key"],
                    row["name"],
                    row["os_version"],
                    row["online"],
                    row["internet_reachable"],
                    row["last_heartbeat_at"],
                    row["automation_state"],
                    row["last_error"],
                    row["active_windows"],
                    row["exe_path"],
                    row["retries_today"],
                ),
            )

        for row in rows_by_table["device_configs"]:
            connection.execute(
                """
                INSERT INTO device_configs (
                  device_id, exe_path, launch_args, window_count, health_check_interval_sec,
                  reconnect_cooldown_sec, automation_rules
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (device_id) DO UPDATE SET
                  exe_path = EXCLUDED.exe_path,
                  launch_args = EXCLUDED.launch_args,
                  window_count = EXCLUDED.window_count,
                  health_check_interval_sec = EXCLUDED.health_check_interval_sec,
                  reconnect_cooldown_sec = EXCLUDED.reconnect_cooldown_sec,
                  automation_rules = EXCLUDED.automation_rules
                """,
                (
                    row["device_id"],
                    row["exe_path"],
                    row["launch_args"],
                    row["window_count"],
                    row["health_check_interval_sec"],
                    row["reconnect_cooldown_sec"],
                    row["automation_rules"],
                ),
            )

        for row in rows_by_table["window_profiles"]:
            connection.execute(
                """
                INSERT INTO window_profiles (
                  id, device_id, slot, email, credential_id, post_login_choice, position, last_action
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  device_id = EXCLUDED.device_id,
                  slot = EXCLUDED.slot,
                  email = EXCLUDED.email,
                  credential_id = EXCLUDED.credential_id,
                  post_login_choice = EXCLUDED.post_login_choice,
                  position = EXCLUDED.position,
                  last_action = EXCLUDED.last_action
                """,
                (
                    row["id"],
                    row["device_id"],
                    row["slot"],
                    row["email"],
                    row["credential_id"],
                    row["post_login_choice"],
                    row["position"],
                    row["last_action"],
                ),
            )

        for row in rows_by_table["device_events"]:
            connection.execute(
                """
                INSERT INTO device_events (id, device_id, level, event_type, message, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  device_id = EXCLUDED.device_id,
                  level = EXCLUDED.level,
                  event_type = EXCLUDED.event_type,
                  message = EXCLUDED.message,
                  created_at = EXCLUDED.created_at
                """,
                (
                    row["id"],
                    row["device_id"],
                    row["level"],
                    row["event_type"],
                    row["message"],
                    row["created_at"],
                ),
            )

        for row in rows_by_table["device_commands"]:
            connection.execute(
                """
                INSERT INTO device_commands (
                  id, device_id, command_type, payload, status, created_at, acknowledged_at, note
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                  device_id = EXCLUDED.device_id,
                  command_type = EXCLUDED.command_type,
                  payload = EXCLUDED.payload,
                  status = EXCLUDED.status,
                  created_at = EXCLUDED.created_at,
                  acknowledged_at = EXCLUDED.acknowledged_at,
                  note = EXCLUDED.note
                """,
                (
                    row["id"],
                    row["device_id"],
                    row["command_type"],
                    row["payload"],
                    row["status"],
                    row["created_at"],
                    row["acknowledged_at"],
                    row["note"],
                ),
            )

    print("Tasima tamamlandi.")
    for table_name in TABLES:
        print(f"- {table_name}: {len(rows_by_table[table_name])} kayit")


if __name__ == "__main__":
    main()
