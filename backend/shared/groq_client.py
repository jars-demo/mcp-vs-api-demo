"""
Talking to Groq.

Both modes use the same model, the same system prompt and the same
tool-calling loop. The only difference is where the tools come from and how
they are executed:

    API mode  -> tools are hard-coded in api_mode/tools.py, run as Python functions
    MCP mode  -> tools are discovered with tools/list, run with tools/call
"""

from __future__ import annotations

import json
from typing import Any

from groq import AsyncGroq

from shared.config import get_settings
from shared.errors import groq_not_configured

SYSTEM_PROMPT = (
    "You are a helpful assistant in a live developer workshop. "
    "You can use tools, but only call a tool when it is actually needed to answer. "
    "If no tool is needed (for example greetings, jokes or general questions), answer directly. "
    "Weather tools return demo data, so mention that the weather is demo data. "
    "Keep answers short: one to three sentences, in plain text without Markdown."
)

# Safety net so a confused model cannot loop forever.
MAX_TOOL_ROUNDS = 3


def create_groq_client() -> AsyncGroq:
    """Create a Groq client. The API key stays on the server."""
    settings = get_settings()
    if not settings.groq_configured:
        raise groq_not_configured()
    return AsyncGroq(api_key=settings.groq_api_key, timeout=30.0, max_retries=1)


def first_messages(user_message: str) -> list[dict[str, Any]]:
    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_message},
    ]


async def ask_model(
    client: AsyncGroq,
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
) -> Any:
    """
    Send the conversation to Groq and return the assistant message.

    With tools, the *model* decides whether to answer directly or to request
    one or more tool calls (message.tool_calls). We never hard-code that choice.
    """
    request: dict[str, Any] = {
        "model": get_settings().groq_model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": 1024,  # headroom for models that reason before answering
    }
    if tools:
        request["tools"] = tools
        request["tool_choice"] = "auto"
    response = await client.chat.completions.create(**request)
    return response.choices[0].message


def assistant_message(message: Any) -> dict[str, Any]:
    """Convert Groq's assistant message (with tool calls) back into a plain dict."""
    return {
        "role": "assistant",
        "content": message.content or "",
        "tool_calls": [
            {
                "id": call.id,
                "type": "function",
                "function": {"name": call.function.name, "arguments": call.function.arguments},
            }
            for call in message.tool_calls
        ],
    }


def tool_message(tool_call_id: str, result: dict[str, Any]) -> dict[str, Any]:
    """The message that hands a tool result back to the model."""
    return {"role": "tool", "tool_call_id": tool_call_id, "content": json.dumps(result, ensure_ascii=False)}


def parse_arguments(raw: str | None) -> dict[str, Any]:
    """Tool arguments arrive as a JSON string. Return {} if it is not valid JSON."""
    try:
        parsed = json.loads(raw or "{}")
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def describe_tool_calls(message: Any) -> list[dict[str, Any]]:
    return [
        {"id": call.id, "name": call.function.name, "arguments": parse_arguments(call.function.arguments)}
        for call in message.tool_calls or []
    ]
