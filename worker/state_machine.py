from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class WorkerState(str, Enum):
    IDLE = "idle"
    CHECKING = "checking"
    RELAUNCHING = "relaunching"
    LOGGING_IN = "logging_in"
    POSITIONING = "positioning"
    ERROR = "error"


@dataclass
class RuntimeSignal:
    internet_reachable: bool
    logout_detected: bool
    login_screen_visible: bool
    positioning_required: bool


def next_state(current: WorkerState, signal: RuntimeSignal) -> WorkerState:
    if not signal.internet_reachable:
        return WorkerState.CHECKING

    if signal.logout_detected:
        return WorkerState.RELAUNCHING

    if current == WorkerState.RELAUNCHING and signal.login_screen_visible:
        return WorkerState.LOGGING_IN

    if current == WorkerState.LOGGING_IN and signal.positioning_required:
        return WorkerState.POSITIONING

    if signal.positioning_required:
        return WorkerState.POSITIONING

    if current in {WorkerState.POSITIONING, WorkerState.CHECKING, WorkerState.LOGGING_IN, WorkerState.RELAUNCHING}:
        return WorkerState.IDLE

    return current if current != WorkerState.ERROR else WorkerState.CHECKING
