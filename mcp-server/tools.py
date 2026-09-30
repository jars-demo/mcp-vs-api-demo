"""
Tool implementations for the MCP server.

These are plain Python functions with no MCP code in them.
`server.py` is the file that exposes them over the Model Context Protocol.

In a real project, a function like `get_weather()` would usually call a REST
API, a database or an internal service. MCP does not replace those APIs.
It is a standard way to *expose* them to AI applications.
"""

from __future__ import annotations

import ast
import operator
import re
from typing import Any

# ─────────────────────────────────────────────────────────────
#  Weather (demo data, not live weather)
# ─────────────────────────────────────────────────────────────

# Same data as backend/shared/weather.py, so both modes return identical
# results. A test checks that the two copies stay in sync.
WEATHER_DATA: dict[str, dict[str, Any]] = {
    "Mumbai": {"temperature_celsius": 29, "condition": "Partly cloudy", "humidity": 72},
    "Delhi": {"temperature_celsius": 33, "condition": "Hazy sunshine", "humidity": 41},
    "Bangalore": {"temperature_celsius": 24, "condition": "Light rain", "humidity": 80},
    "London": {"temperature_celsius": 14, "condition": "Overcast", "humidity": 77},
    "New York": {"temperature_celsius": 18, "condition": "Clear skies", "humidity": 55},
    "Singapore": {"temperature_celsius": 31, "condition": "Thunderstorms", "humidity": 84},
}

# Returned for any city that is not in WEATHER_DATA.
FALLBACK_WEATHER: dict[str, Any] = {"temperature_celsius": 22, "condition": "Mild", "humidity": 60}

DEMO_NOTE = "Demo data — not live weather"


def get_weather(city: str) -> dict[str, Any]:
    """Return deterministic demo weather for a city."""
    name = " ".join(city.strip().split())[:60]
    for known_city, data in WEATHER_DATA.items():
        if known_city.lower() == name.lower():
            return {"city": known_city, **data, "source": DEMO_NOTE}
    return {"city": name.title() or "Unknown", **FALLBACK_WEATHER, "source": DEMO_NOTE}


# ─────────────────────────────────────────────────────────────
#  Calculator (safe — never uses eval())
# ─────────────────────────────────────────────────────────────

_BINARY_OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
_UNARY_OPERATORS = {ast.UAdd: operator.pos, ast.USub: operator.neg}

MAX_EXPRESSION_LENGTH = 200
MAX_EXPONENT = 100


def _evaluate(node: ast.AST) -> float:
    """Walk the parsed expression and allow only numbers and arithmetic."""
    if isinstance(node, ast.Expression):
        return _evaluate(node.body)
    if isinstance(node, ast.Constant) and type(node.value) in (int, float):
        return node.value
    if isinstance(node, ast.BinOp) and type(node.op) in _BINARY_OPERATORS:
        left, right = _evaluate(node.left), _evaluate(node.right)
        if isinstance(node.op, ast.Pow) and abs(right) > MAX_EXPONENT:
            raise ValueError(f"Exponent too large (max {MAX_EXPONENT})")
        return _BINARY_OPERATORS[type(node.op)](left, right)
    if isinstance(node, ast.UnaryOp) and type(node.op) in _UNARY_OPERATORS:
        return _UNARY_OPERATORS[type(node.op)](_evaluate(node.operand))
    raise ValueError("Only numbers and + - * / // % ** ( ) are allowed")


def calculate(expression: str) -> dict[str, Any]:
    """Safely evaluate a basic arithmetic expression like '42 * 17'."""
    cleaned = expression.replace("×", "*").replace("÷", "/").replace("^", "**").strip()
    cleaned = re.sub(r"(?<=\d)\s*[xX]\s*(?=\d)", " * ", cleaned)  # "42 x 17" -> "42 * 17"
    if not cleaned:
        return {"expression": expression, "error": "Expression is empty"}
    if len(cleaned) > MAX_EXPRESSION_LENGTH:
        return {"expression": expression[:50], "error": "Expression is too long"}
    try:
        value = _evaluate(ast.parse(cleaned, mode="eval"))
    except ZeroDivisionError:
        return {"expression": cleaned, "error": "Division by zero"}
    except (SyntaxError, ValueError, TypeError, OverflowError) as exc:
        message = str(exc) if isinstance(exc, ValueError) else "Invalid expression"
        return {"expression": cleaned, "error": message}
    if isinstance(value, float) and value.is_integer():
        value = int(value)
    return {"expression": cleaned, "result": value}
