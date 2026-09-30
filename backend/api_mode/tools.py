"""
API mode tools: the application defines and runs its own tools.

Two things live here, both written by hand:

    1. TOOL_DEFINITIONS - the JSON schemas we send to the model
    2. TOOL_FUNCTIONS   - the Python functions we run when the model asks

To add a tool in API mode you edit *this backend file*. Compare with MCP
mode, where the backend learns about tools from the MCP server at runtime.
"""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

from shared.calculator import calculate
from shared.weather import get_weather

# 1. What the model is told about each tool (Groq / OpenAI function-calling format).
TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Get weather information for a city. Returns demo data, not live weather.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string", "description": "City name, for example Mumbai or London"},
                },
                "required": ["city"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "calculate",
            "description": "Evaluate a basic arithmetic expression (+ - * / // % ** and parentheses).",
            "parameters": {
                "type": "object",
                "properties": {
                    "expression": {"type": "string", "description": "Arithmetic expression, for example 42 * 17"},
                },
                "required": ["expression"],
            },
        },
    },
]

# 2. Which Python function runs for each tool name.
TOOL_FUNCTIONS: dict[str, Callable[..., dict[str, Any]]] = {
    "get_weather": get_weather,
    "calculate": calculate,
}


def run_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Call the matching Python function directly. No protocol involved."""
    function = TOOL_FUNCTIONS.get(name)
    if function is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return function(**arguments)
    except TypeError:
        return {"error": f"Invalid arguments for {name}"}
