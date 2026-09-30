"""
Execution events streamed to the browser.

Every step you see in the simulator timeline is one of these events.
Nothing in the UI is faked: the backend emits an event as each step happens.

Event shapes (sent as Server-Sent Events, one JSON object per message):

    {"type": "step",  "mode": "api", "step_id": "model", "stage": "model",
     "title": "Groq", "description": "...", "status": "running",
     "node": "groq", "details": {...}, "timestamp": "...", "elapsed_ms": 12}

    {"type": "error", "mode": "mcp", "code": "mcp_unavailable",
     "message": "MCP server unavailable.", "hint": "...", "technical": "..."}

    {"type": "done",  "mode": "api", "answer": "...", "elapsed_ms": 1840}

`step_id` stays the same while a step moves from "running" to "success",
so the UI updates the existing row instead of adding a new one.
Repeated steps get a suffix, e.g. "tool#2".
"""

from __future__ import annotations

import json
import time
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any, Literal

from shared.errors import WorkshopError

Mode = Literal["api", "mcp"]
Status = Literal["running", "success", "error"]
Event = dict[str, Any]
Emit = Callable[[Event], Awaitable[None]]


class Timeline:
    """Small helper that turns 'this step happened' into an event."""

    def __init__(self, mode: Mode, emit: Emit) -> None:
        self.mode = mode
        self._emit = emit
        self._started = time.perf_counter()
        self._current: Event | None = None
        self._counters: dict[str, int] = {}
        self.failed = False

    def _elapsed_ms(self) -> int:
        return round((time.perf_counter() - self._started) * 1000)

    def next_id(self, base: str) -> str:
        """Return 'tool' the first time, then 'tool#2', 'tool#3', ..."""
        count = self._counters.get(base, 0) + 1
        self._counters[base] = count
        return base if count == 1 else f"{base}#{count}"

    async def step(
        self,
        step_id: str,
        stage: str,
        title: str,
        description: str,
        status: Status = "success",
        *,
        node: str | None = None,
        details: dict[str, Any] | None = None,
    ) -> None:
        event: Event = {
            "type": "step",
            "mode": self.mode,
            "step_id": step_id,
            "stage": stage,
            "title": title,
            "description": description,
            "status": status,
            "node": node,
            "details": details,
            "timestamp": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            "elapsed_ms": self._elapsed_ms(),
        }
        self._current = event
        await self._emit(event)

    async def fail(self, error: WorkshopError) -> None:
        """Mark the step that was running as failed, then send the error."""
        self.failed = True
        if self._current is not None:
            await self.step(
                self._current["step_id"],
                self._current["stage"],
                self._current["title"],
                error.message,
                "error",
                node=self._current["node"],
                details=self._current["details"],
            )
        await self._emit(
            {
                "type": "error",
                "mode": self.mode,
                "code": error.code,
                "message": error.message,
                "hint": error.hint,
                "technical": error.technical,
                "elapsed_ms": self._elapsed_ms(),
            }
        )

    async def answered(self, model_step_id: str, answer: str) -> None:
        """The model replied without asking for (more) tools: close the model step and show the response."""
        if model_step_id == "model":
            await self.step(
                model_step_id,
                "model",
                "Groq answered directly",
                "No tool was needed for this prompt, so the model replied on its own.",
                node="groq",
                details={"tool_calls": []},
            )
        else:
            await self.step(
                model_step_id,
                "model",
                "Final response",
                "Groq turned the tool result into a natural-language answer.",
                node="groq",
            )
        preview = answer if len(answer) <= 160 else answer[:157] + "..."
        await self.step("response", "response", "Response", preview, node="react", details={"answer": answer})

    async def done(self, answer: str) -> None:
        await self._emit({"type": "done", "mode": self.mode, "answer": answer, "elapsed_ms": self._elapsed_ms()})


def summarize_tool_result(tool_name: str, result: dict[str, Any]) -> str:
    """One-line summary for the timeline, e.g. 'Mumbai · 29°C · Partly cloudy'."""
    if "error" in result:
        return f"Error: {result['error']}"
    if tool_name == "get_weather" and "city" in result:
        return f"{result['city']} · {result.get('temperature_celsius')}°C · {result.get('condition')}"
    if tool_name == "calculate" and "result" in result:
        return f"{result.get('expression')} = {result['result']}"
    text = json.dumps(result, ensure_ascii=False)
    return text if len(text) <= 80 else text[:77] + "..."


def format_call(tool_name: str, arguments: dict[str, Any]) -> str:
    """Render a call like get_weather(city="Mumbai")."""
    args = ", ".join(f"{key}={json.dumps(value, ensure_ascii=False)}" for key, value in arguments.items())
    return f"{tool_name}({args})"
