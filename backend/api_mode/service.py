"""
API mode: the application controls the integration.

    React -> FastAPI -> Groq -> get_weather() (a Python function) -> Groq -> answer

The backend already knows every tool (api_mode/tools.py). It gives the model
those hand-written definitions, and when the model asks for a tool, the
backend calls its own function directly.
"""

from __future__ import annotations

import logging
from typing import Any

from api_mode.tools import TOOL_DEFINITIONS, run_tool
from shared import groq_client
from shared.config import get_settings
from shared.errors import to_workshop_error
from shared.events import Emit, Timeline, format_call, summarize_tool_result

logger = logging.getLogger(__name__)

ENDPOINT = "/api/api-mode/chat"


async def run(message: str, emit: Emit) -> None:
    """Handle one chat request and stream every step to the browser."""
    timeline = Timeline("api", emit)
    try:
        answer = await _run(message, timeline)
    except Exception as exc:  # noqa: BLE001 - every error becomes a friendly UI message
        error = to_workshop_error(exc)
        if error.code == "internal_error":
            logger.exception("API mode failed")
        await timeline.fail(error)
        return
    await timeline.done(answer)


async def _run(message: str, timeline: Timeline) -> str:
    await timeline.step("user", "user", "Prompt received", f'"{message}"', node="user", details={"message": message})

    await timeline.step(
        "backend",
        "backend",
        f"POST {ENDPOINT}",
        "FastAPI received the request. The application decides how tools are connected.",
        node="fastapi",
        details={
            "request": {
                "method": "POST",
                "path": ENDPOINT,
                "headers": {"Content-Type": "application/json"},
                "body": {"message": message},
            },
            "tools_source": "Hard-coded in backend/api_mode/tools.py",
        },
    )

    model = get_settings().groq_model
    tool_names = [tool["function"]["name"] for tool in TOOL_DEFINITIONS]
    await timeline.step(
        "model",
        "model",
        "Groq",
        f"Sending the prompt and {len(tool_names)} application-defined tools to {model}.",
        "running",
        node="groq",
        details={"model": model, "tool_choice": "auto", "tools": TOOL_DEFINITIONS},
    )
    client = groq_client.create_groq_client()
    messages = groq_client.first_messages(message)
    model_step = "model"

    for round_number in range(1, groq_client.MAX_TOOL_ROUNDS + 1):
        is_last_round = round_number == groq_client.MAX_TOOL_ROUNDS
        reply = await groq_client.ask_model(client, messages, None if is_last_round else TOOL_DEFINITIONS)

        if not reply.tool_calls:
            answer = (reply.content or "").strip()
            await timeline.answered(model_step, answer)
            return answer

        calls = groq_client.describe_tool_calls(reply)
        names = ", ".join(call["name"] for call in calls)
        await timeline.step(
            model_step,
            "model",
            f"Groq decides to use {names}",
            "The model chose the tool. The backend did not hard-code this decision.",
            node="groq",
            details={"tool_calls": calls},
        )

        messages.append(groq_client.assistant_message(reply))
        for call in calls:
            result = await _run_tool(timeline, call["name"], call["arguments"])
            messages.append(groq_client.tool_message(call["id"], result))

        model_step = timeline.next_id("model_final")
        await timeline.step(
            model_step,
            "model",
            "Final response",
            "Sending the tool result back to Groq to write the answer.",
            "running",
            node="groq",
        )

    raise RuntimeError("Model did not produce an answer")  # pragma: no cover


async def _run_tool(timeline: Timeline, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    tool_step = timeline.next_id("tool")
    call_text = format_call(name, arguments)
    await timeline.step(
        tool_step,
        "tool",
        call_text,
        "The backend calls its own Python function directly.",
        "running",
        node="app_tool",
        details={"function": f"api_mode.tools.{name}", "arguments": arguments},
    )
    result = run_tool(name, arguments)
    await timeline.step(
        tool_step,
        "tool",
        call_text,
        "The backend calls its own Python function directly.",
        node="app_tool",
        details={"function": f"api_mode.tools.{name}", "arguments": arguments},
    )
    await timeline.step(
        timeline.next_id("data"),
        "data",
        summarize_tool_result(name, result),
        "Demo data — not live weather" if name == "get_weather" else "Returned by the Python function",
        node="data",
        details={"result": result},
    )
    return result

