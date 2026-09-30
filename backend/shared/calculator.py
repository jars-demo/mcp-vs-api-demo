"""
A safe calculator shared by API mode.

It parses the expression into a syntax tree and only allows numbers and
arithmetic operators, so it never runs arbitrary code (no eval()).
The MCP server has an identical copy in mcp-server/tools.py.
"""

from __future__ import annotations

import ast
import operator
from typing import Any

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
