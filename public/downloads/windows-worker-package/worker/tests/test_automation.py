from types import SimpleNamespace

from worker.automation import _format_hotkey, _quadrant_rectangles, process_matches_exe


def test_process_matches_executable_name():
    process = SimpleNamespace(
        name=lambda: "broker.exe",
        exe=lambda: r"C:\Apps\BrokerDesk\broker.exe",
    )

    assert process_matches_exe(process, r"D:\Other\broker.exe") is True


def test_quadrant_rectangles_follow_window_count():
    rectangles = _quadrant_rectangles(window_count=3, screen_width=1200, screen_height=800)

    assert rectangles == [
        (0, 0, 600, 400),
        (600, 0, 600, 400),
        (0, 400, 600, 400),
    ]


def test_hotkey_formatter_supports_common_combinations():
    assert _format_hotkey("CTRL+ALT+L") == "^%l"
    assert _format_hotkey("F5") == "{F5}"
