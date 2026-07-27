from __future__ import annotations

import ctypes
import ntpath
import os
import socket
import subprocess
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

try:
    import psutil
except ImportError:  # pragma: no cover - test/packaging ortami icin yedek
    psutil = None  # type: ignore

from worker.config import WorkerConfig

try:
    import win32con  # type: ignore
    import win32gui  # type: ignore
    import win32process  # type: ignore
except ImportError:  # pragma: no cover - macOS test ortaminda beklenen yol
    win32con = None
    win32gui = None
    win32process = None


@dataclass
class RuntimeInspection:
    internet_reachable: bool
    process_count: int
    active_windows: int
    login_screen_visible: bool = False
    logout_detected: bool = False
    positioning_required: bool = False
    last_error: str | None = None


def _normalized_exe_name(exe_path: str) -> str:
    return ntpath.basename(exe_path).lower()


def process_matches_exe(process: psutil.Process, exe_path: str) -> bool:
    target_name = _normalized_exe_name(exe_path)
    if psutil is None:
        process_name = (process.name() or "").lower()
        process_exe = process.exe()
        return process_name == target_name or (bool(process_exe) and os.path.basename(process_exe).lower() == target_name)

    try:
        process_name = (process.name() or "").lower()
        if process_name == target_name:
            return True

        process_exe = process.exe()
        return bool(process_exe) and os.path.basename(process_exe).lower() == target_name
    except (psutil.AccessDenied, psutil.NoSuchProcess, psutil.ZombieProcess, OSError):
        return False


def list_target_processes(exe_path: str) -> list[psutil.Process]:
    if psutil is None:
        return []
    return [process for process in psutil.process_iter(["name", "exe"]) if process_matches_exe(process, exe_path)]


def check_connectivity(api_base_url: str, timeout_sec: float = 2.0) -> bool:
    parsed = urlparse(api_base_url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if not host:
        return False

    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            return True
    except OSError:
        return False


def _enum_matching_window_handles(exe_path: str) -> list[int]:
    if not win32gui or not win32process:
        return []

    matching_pids = {process.pid for process in list_target_processes(exe_path)}
    handles: list[int] = []

    def callback(hwnd: int, extra: Any) -> bool:
        if not win32gui.IsWindowVisible(hwnd):
            return True
        if not win32gui.GetWindowText(hwnd):
            return True

        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        if pid in matching_pids:
            handles.append(hwnd)
        return True

    win32gui.EnumWindows(callback, None)
    return handles


def count_target_windows(exe_path: str) -> int:
    handles = _enum_matching_window_handles(exe_path)
    if handles:
        return len(handles)
    return len(list_target_processes(exe_path))


def start_missing_processes(config: WorkerConfig, current_process_count: int) -> int:
    missing = max(config.window_count - current_process_count, 0)
    if missing == 0:
        return 0

    for _ in range(missing):
        subprocess.Popen([config.exe_path, *config.launch_args], cwd=str(Path(config.exe_path).parent))

    return missing


def _quadrant_rectangles(window_count: int, screen_width: int = 1920, screen_height: int = 1080) -> list[tuple[int, int, int, int]]:
    half_width = screen_width // 2
    half_height = screen_height // 2
    rectangles = [
        (0, 0, half_width, half_height),
        (half_width, 0, half_width, half_height),
        (0, half_height, half_width, half_height),
        (half_width, half_height, half_width, half_height),
    ]
    return rectangles[: max(0, min(window_count, 4))]


def reposition_windows(exe_path: str, window_count: int) -> int:
    if not win32gui or not win32con:
        return 0

    handles = _enum_matching_window_handles(exe_path)[:window_count]
    if not handles:
        return 0

    if not hasattr(ctypes, "windll"):
        return 0

    screen_width = ctypes.windll.user32.GetSystemMetrics(0)
    screen_height = ctypes.windll.user32.GetSystemMetrics(1)

    for hwnd, (x, y, width, height) in zip(handles, _quadrant_rectangles(window_count, screen_width, screen_height)):
        win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
        win32gui.MoveWindow(hwnd, x, y, width, height, True)

    return len(handles)


def inspect_runtime(config: WorkerConfig) -> RuntimeInspection:
    internet_reachable = check_connectivity(config.api_base_url)
    process_count = len(list_target_processes(config.exe_path))
    active_windows = count_target_windows(config.exe_path)
    positioning_required = internet_reachable and active_windows > 0 and active_windows != config.window_count

    return RuntimeInspection(
        internet_reachable=internet_reachable,
        process_count=process_count,
        active_windows=active_windows,
        positioning_required=positioning_required,
        login_screen_visible=False,
        logout_detected=False,
    )
