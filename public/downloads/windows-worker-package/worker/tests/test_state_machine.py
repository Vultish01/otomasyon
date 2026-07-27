from worker.state_machine import RuntimeSignal, WorkerState, next_state


def test_logout_triggers_relaunch():
    signal = RuntimeSignal(
        internet_reachable=True,
        logout_detected=True,
        login_screen_visible=False,
        positioning_required=False,
    )
    assert next_state(WorkerState.IDLE, signal) == WorkerState.RELAUNCHING


def test_login_screen_after_relaunch_moves_to_login():
    signal = RuntimeSignal(
        internet_reachable=True,
        logout_detected=False,
        login_screen_visible=True,
        positioning_required=False,
    )
    assert next_state(WorkerState.RELAUNCHING, signal) == WorkerState.LOGGING_IN


def test_positioning_completion_returns_idle():
    signal = RuntimeSignal(
        internet_reachable=True,
        logout_detected=False,
        login_screen_visible=False,
        positioning_required=False,
    )
    assert next_state(WorkerState.POSITIONING, signal) == WorkerState.IDLE


def test_positioning_need_moves_idle_to_positioning():
    signal = RuntimeSignal(
        internet_reachable=True,
        logout_detected=False,
        login_screen_visible=False,
        positioning_required=True,
    )
    assert next_state(WorkerState.IDLE, signal) == WorkerState.POSITIONING
