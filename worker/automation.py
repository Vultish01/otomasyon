from __future__ import annotations

import ctypes
import json
import ntpath
import os
import socket
import subprocess
import time
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional
from urllib.parse import urlparse

try:
    import keyring
except ImportError:  # pragma: no cover
    keyring = None  # type: ignore

try:
    import psutil
except ImportError:  # pragma: no cover
    psutil = None  # type: ignore

from worker.config import WindowProfile, WorkerConfig

try:
    from pywinauto import Desktop
    from pywinauto.application import Application
    from pywinauto.keyboard import send_keys
    from pywinauto.mouse import click as mouse_click
except ImportError:  # pragma: no cover
    Desktop = None  # type: ignore
    Application = None  # type: ignore
    send_keys = None  # type: ignore
    mouse_click = None  # type: ignore

try:
    import win32con  # type: ignore
    import win32gui  # type: ignore
    import win32process  # type: ignore
except ImportError:  # pragma: no cover
    win32con = None
    win32gui = None
    win32process = None

try:
    import pyautogui
except ImportError:  # pragma: no cover
    pyautogui = None



# #region debug-point B:automation-report
def _debug_report(hypothesis_id: str, location: str, msg: str, data: Optional[dict] = None) -> None:
    env_path = ".dbg/remote-command-control.env"
    debug_url = "http://127.0.0.1:7777/event"
    session_id = "remote-command-control"
    try:
        with open(env_path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if line.startswith("DEBUG_SERVER_URL="):
                    debug_url = line.split("=", 1)[1] or debug_url
                elif line.startswith("DEBUG_SESSION_ID="):
                    session_id = line.split("=", 1)[1] or session_id
    except Exception:
        pass

    try:
        payload = {
            "sessionId": session_id,
            "runId": "pre-fix",
            "hypothesisId": hypothesis_id,
            "location": location,
            "msg": f"[DEBUG] {msg}",
            "data": data or {},
        }
        request = urllib.request.Request(
            debug_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
        )
        urllib.request.urlopen(request, timeout=1).read()
    except Exception:
        pass


# #endregion


@dataclass
class RuntimeInspection:
    internet_reachable: bool
    process_count: int
    active_windows: int
    login_screen_visible: bool = False
    logout_detected: bool = False
    positioning_required: bool = False
    last_error: str | None = None


@dataclass
class LoginWorkflowResult:
    attempted_profiles: int = 0
    completed_profiles: int = 0
    note: str | None = None


def _normalized_exe_name(exe_path: str) -> str:
    return ntpath.basename(exe_path).lower()


def _contains_any(text: str, keywords: list[str]) -> bool:
    lowered = text.lower()
    return any(keyword.strip().lower() in lowered for keyword in keywords if keyword.strip())


def process_matches_exe(process: Any, exe_path: str) -> bool:
    target_name = _normalized_exe_name(exe_path)

    try:
        process_name = (process.name() or "").lower()
        if process_name == target_name:
            return True

        process_exe = process.exe()
        return bool(process_exe) and _normalized_exe_name(process_exe) == target_name
    except Exception:
        return False


def list_target_processes(exe_path: str) -> list[Any]:
    if psutil is None:
        return []
    return [process for process in psutil.process_iter(["name", "exe"]) if process_matches_exe(process, exe_path)]


def check_connectivity(api_base_url: str, timeout_sec: float = 2.0) -> bool:
    parsed = urlparse(api_base_url)
    host = parsed.hostname
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    if not host:
        # #region debug-point B:connectivity-missing-host
        _debug_report("B", "worker/automation.py:check_connectivity", "API host parse edilemedi.", {"api_base_url": api_base_url})
        # #endregion
        return False

    try:
        with socket.create_connection((host, port), timeout=timeout_sec):
            # #region debug-point B:connectivity-ok
            _debug_report("B", "worker/automation.py:check_connectivity", "Socket baglantisi basarili.", {"host": host, "port": port})
            # #endregion
            return True
    except OSError as exc:
        # #region debug-point B:connectivity-failed
        _debug_report(
            "B",
            "worker/automation.py:check_connectivity",
            "Socket baglantisi basarisiz.",
            {"host": host, "port": port, "error": str(exc), "api_base_url": api_base_url},
        )
        # #endregion
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
    return sorted(handles)


def _safe_control_text(control: Any) -> str:
    try:
        return control.window_text() or ""
    except Exception:
        return ""


def _window_text_blob(hwnd: int) -> str:
    parts: list[str] = []
    if win32gui:
        try:
            parts.append(win32gui.GetWindowText(hwnd) or "")
        except Exception:
            pass

    if Desktop is None:
        return " ".join(part for part in parts if part).lower()

    try:
        window = Desktop(backend="uia").window(handle=hwnd)
        descendants = window.descendants()[:50]
        parts.extend(_safe_control_text(control) for control in descendants)
    except Exception:
        pass

    return " ".join(part for part in parts if part).lower()


def count_target_windows(exe_path: str) -> int:
    handles = _enum_matching_window_handles(exe_path)
    if handles:
        return len(handles)
    return len(list_target_processes(exe_path))


def start_missing_processes(config: WorkerConfig, current_process_count: int) -> int:
    missing = max(config.window_count - current_process_count, 0)
    if missing == 0:
        return 0

    started = 0
    for _ in range(missing):
        try:
            subprocess.Popen([config.exe_path, *config.launch_args], cwd=str(Path(config.exe_path).parent))
            started += 1
        except OSError:
            break

    return started


def close_target_processes(exe_path: str) -> int:
    processes = list_target_processes(exe_path)
    terminated = 0

    for process in processes:
        try:
            process.terminate()
            terminated += 1
        except Exception:
            continue

    if psutil is not None and processes:
        try:
            _, alive = psutil.wait_procs(processes, timeout=4)
            for process in alive:
                try:
                    process.kill()
                except Exception:
                    continue
        except Exception:
            pass

    return terminated


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
    if not win32gui or not win32con or not hasattr(ctypes, "windll"):
        return 0

    handles = _enum_matching_window_handles(exe_path)[:window_count]
    if not handles:
        return 0

    screen_width = ctypes.windll.user32.GetSystemMetrics(0)
    screen_height = ctypes.windll.user32.GetSystemMetrics(1)

    for hwnd, (x, y, width, height) in zip(handles, _quadrant_rectangles(window_count, screen_width, screen_height)):
        try:
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            win32gui.MoveWindow(hwnd, x, y, width, height, True)
        except Exception:
            continue

    return len(handles)


def _find_matching_control(window: Any, keywords: list[str], control_types: tuple[str, ...]) -> Any | None:
    try:
        descendants = window.descendants()
    except Exception:
        return None

    candidates: list[Any] = []
    for control in descendants:
        try:
            info = control.element_info
            control_type = getattr(info, "control_type", None)
        except Exception:
            control_type = None

        if control_type not in control_types:
            continue

        text = _safe_control_text(control)
        if _contains_any(text, keywords):
            return control
        candidates.append(control)

    return candidates[0] if candidates else None


def _set_edit_text(control: Any, value: str) -> bool:
    try:
        control.set_focus()
    except Exception:
        pass

    for action in ("set_edit_text", "type_keys"):
        try:
            if action == "set_edit_text":
                control.set_edit_text(value)
            else:
                control.type_keys("^a{BACKSPACE}" + value, with_spaces=True, set_foreground=True)
            return True
        except Exception:
            continue
    return False


def _click_control(control: Any) -> bool:
    for action in ("click_input", "invoke"):
        try:
            getattr(control, action)()
            return True
        except Exception:
            continue
    return False


def _format_hotkey(hotkey: str) -> str:
    tokens = [token.strip().lower() for token in hotkey.split("+") if token.strip()]
    if not tokens:
        return ""

    modifiers: list[str] = []
    key = tokens[-1]
    for token in tokens[:-1]:
        if token in {"ctrl", "control"}:
            modifiers.append("^")
        elif token == "alt":
            modifiers.append("%")
        elif token == "shift":
            modifiers.append("+")

    named_keys = {
        "enter": "{ENTER}",
        "tab": "{TAB}",
        "esc": "{ESC}",
        "escape": "{ESC}",
        "space": " ",
    }
    if key.startswith("f") and key[1:].isdigit():
        key_value = "{" + key.upper() + "}"
    else:
        key_value = named_keys.get(key, key[-1] if len(key) > 1 else key)
    return "".join(modifiers) + key_value


def press_hotkey(hotkey: str) -> bool:
    if send_keys is None or not hotkey.strip():
        return False
    try:
        send_keys(_format_hotkey(hotkey), pause=0.05)
        return True
    except Exception:
        return False


def run_helper_automation(config: WorkerConfig) -> tuple[bool, str | None]:
    helper = config.automation_rules.helper_automation
    if not helper.enabled or not helper.program_path:
        return (False, "Yardimci otomasyon kapali.")

    try:
        subprocess.Popen([helper.program_path, *helper.launch_args], cwd=str(Path(helper.program_path).parent))
    except OSError as exc:
        return (False, str(exc))

    if helper.wait_after_launch_sec > 0:
        time.sleep(helper.wait_after_launch_sec)

    if helper.trigger == "hotkey":
        if not helper.hotkey:
            return (False, "Hotkey tanimli degil.")
        hotkey_sent = press_hotkey(helper.hotkey)
        return (hotkey_sent, None if hotkey_sent else "Hotkey gonderilemedi.")

    if helper.trigger == "click":
        if mouse_click is None:
            return (False, "pywinauto mouse modulu bulunamadi.")
        try:
            mouse_click(button=helper.click_button, coords=(helper.click_x, helper.click_y))
            return (True, None)
        except Exception as exc:
            return (False, str(exc))

    if helper.trigger == "image":
        if pyautogui is None:
            return (False, "pyautogui modulu bulunamadi.")
        if not helper.click_image_path:
            return (False, "Resim dosya yolu belirtilmemis.")
        
        try:
            for attempt in range(3):
                try:
                    location = pyautogui.locateCenterOnScreen(helper.click_image_path, confidence=helper.click_image_confidence)
                    if location:
                        pyautogui.click(location.x, location.y, button=helper.click_button)
                        return (True, None)
                except pyautogui.ImageNotFoundException:
                    pass
                
                # Sürüm farklarından dolayı None dönebilir (ImageNotFound fırlatmayabilir)
                location = pyautogui.locateCenterOnScreen(helper.click_image_path, confidence=helper.click_image_confidence)
                if location is not None:
                    pyautogui.click(location.x, location.y, button=helper.click_button)
                    return (True, None)
                    
                time.sleep(1)
            return (False, f"Belirtilen resim ekranda bulunamadi: {helper.click_image_path}")
        except Exception as exc:
            return (False, f"Resim arama sirasinda hata: {exc}")

    return (True, None)


def run_pre_login_actions(config: WorkerConfig) -> str | None:
    notes: list[str] = []
    if config.automation_rules.pre_login_hotkey_enabled and config.automation_rules.pre_login_hotkey:
        if not press_hotkey(config.automation_rules.pre_login_hotkey):
            notes.append("Login oncesi hotkey gonderilemedi.")

    helper = config.automation_rules.helper_automation
    if helper.enabled:
        success, helper_note = run_helper_automation(config)
        if not success and helper_note:
            notes.append(helper_note)

    if not notes:
        return None
    return " ".join(notes)


def _lookup_password(credential_id: str) -> str | None:
    if keyring is None:
        return None
    try:
        return keyring.get_password("otologin", credential_id)
    except Exception:
        return None


def _select_post_login_choice(window: Any, choice_text: str | None) -> bool:
    if not choice_text:
        return True

    control = _find_matching_control(
        window,
        [choice_text],
        ("Button", "ListItem", "Text", "Hyperlink"),
    )
    if control is None:
        return False
    return _click_control(control)


def _login_windows(config: WorkerConfig) -> list[int]:
    handles = _enum_matching_window_handles(config.exe_path)
    return [
        handle
        for handle in handles
        if _contains_any(_window_text_blob(handle), config.automation_rules.login_window_keywords)
    ]


def inspect_runtime(config: WorkerConfig) -> RuntimeInspection:
    internet_reachable = check_connectivity(config.api_base_url)
    process_count = len(list_target_processes(config.exe_path))
    handles = _enum_matching_window_handles(config.exe_path)
    active_windows = len(handles) if handles else process_count

    login_visible = False
    success_visible = False
    for handle in handles:
        blob = _window_text_blob(handle)
        if _contains_any(blob, config.automation_rules.login_window_keywords):
            login_visible = True
        if config.automation_rules.success_window_keywords and _contains_any(
            blob, config.automation_rules.success_window_keywords
        ):
            success_visible = True

    positioning_required = internet_reachable and active_windows > 0 and active_windows != config.window_count
    logout_detected = login_visible and active_windows > 0 and not success_visible

    # #region debug-point E:inspect-runtime
    _debug_report(
        "E",
        "worker/automation.py:inspect_runtime",
        "Runtime inspection tamamlandi.",
        {
            "device_id": config.device_id,
            "internet_reachable": internet_reachable,
            "process_count": process_count,
            "active_windows": active_windows,
            "login_visible": login_visible,
            "success_visible": success_visible,
            "positioning_required": positioning_required,
            "logout_detected": logout_detected,
        },
    )
    # #endregion

    return RuntimeInspection(
        internet_reachable=internet_reachable,
        process_count=process_count,
        active_windows=active_windows,
        login_screen_visible=login_visible,
        logout_detected=logout_detected,
        positioning_required=positioning_required,
        last_error="Login ekrani gorunuyor." if logout_detected else None,
    )


def perform_login_workflow(config: WorkerConfig) -> LoginWorkflowResult:
    if Desktop is None or Application is None:
        return LoginWorkflowResult(note="pywinauto bulunamadi.")
    if not config.automation_rules.auto_login_enabled:
        return LoginWorkflowResult(note="Otomatik login kapali.")

    pre_login_note = run_pre_login_actions(config)
    if pre_login_note:
        time.sleep(1)

    login_handles = _login_windows(config)
    if not login_handles:
        return LoginWorkflowResult(note=pre_login_note or "Login ekrani bulunamadi.")

    profiles = [profile for profile in config.profiles if profile.email][: config.window_count]
    if not profiles:
        return LoginWorkflowResult(note="Login icin kayitli profil yok.")

    result = LoginWorkflowResult()
    for handle, profile in zip(login_handles, profiles):
        result.attempted_profiles += 1
        password = _lookup_password(profile.credential_id)
        if not password:
            result.note = f"{profile.credential_id} icin sifre bulunamadi."
            continue

        try:
            app = Application(backend="uia").connect(handle=handle)
            window = app.window(handle=handle)
            email_control = _find_matching_control(window, config.automation_rules.email_field_hints, ("Edit",))
            password_control = _find_matching_control(window, config.automation_rules.password_field_hints, ("Edit",))

            edits = window.descendants(control_type="Edit")
            if email_control is None and edits:
                email_control = edits[0]
            if password_control is None and len(edits) > 1:
                password_control = edits[1]

            if email_control is None or password_control is None:
                result.note = "Email veya sifre alani bulunamadi."
                continue

            _set_edit_text(email_control, profile.email)
            _set_edit_text(password_control, password)

            submit_control = _find_matching_control(
                window,
                config.automation_rules.submit_button_hints,
                ("Button", "Hyperlink"),
            )
            if submit_control is None:
                result.note = "Login butonu bulunamadi."
                continue

            if not _click_control(submit_control):
                result.note = "Login butonuna tiklanamadi."
                continue

            time.sleep(config.automation_rules.post_login_wait_sec)
            _select_post_login_choice(window, profile.post_login_choice)
            result.completed_profiles += 1
        except Exception as exc:
            result.note = str(exc)

    if result.note is None and pre_login_note:
        result.note = pre_login_note

    return result
