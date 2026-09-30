"""Tests for the demo tools used by API mode."""

from __future__ import annotations

import importlib.util
from pathlib import Path

import pytest

from api_mode.tools import TOOL_DEFINITIONS, TOOL_FUNCTIONS, run_tool
from shared import calculator, weather

MCP_TOOLS_FILE = Path(__file__).resolve().parents[2] / "mcp-server" / "tools.py"


def test_known_city_returns_demo_weather() -> None:
    assert weather.get_weather("Mumbai") == {
        "city": "Mumbai",
        "temperature_celsius": 29,
        "condition": "Partly cloudy",
        "humidity": 72,
        "source": "Demo data — not live weather",
    }


def test_city_lookup_ignores_case_and_spaces() -> None:
    assert weather.get_weather("  new   york ")["city"] == "New York"


def test_unknown_city_gets_deterministic_fallback() -> None:
    first, second = weather.get_weather("Atlantis"), weather.get_weather("Atlantis")
    assert first == second
    assert first["temperature_celsius"] == weather.FALLBACK_WEATHER["temperature_celsius"]


@pytest.mark.parametrize(
    ("expression", "expected"),
    [("42 * 17", 714), ("42 × 17", 714), ("(2 + 3) * 4", 20), ("10 / 4", 2.5), ("2 ^ 10", 1024), ("-3 + 1", -2)],
)
def test_calculator(expression: str, expected: float) -> None:
    assert calculator.calculate(expression)["result"] == expected


@pytest.mark.parametrize(
    "expression",
    ["__import__('os').system('ls')", "open('secrets.txt')", "x + 1", "9 ** 9999", "1 / 0", "", "1" * 300],
)
def test_calculator_rejects_unsafe_input(expression: str) -> None:
    assert "error" in calculator.calculate(expression)


def test_every_api_tool_has_a_function() -> None:
    assert {tool["function"]["name"] for tool in TOOL_DEFINITIONS} == set(TOOL_FUNCTIONS)


def test_run_tool_handles_bad_requests() -> None:
    assert run_tool("does_not_exist", {}) == {"error": "Unknown tool: does_not_exist"}
    assert "error" in run_tool("get_weather", {"town": "Mumbai"})


def test_api_mode_and_mcp_server_use_the_same_data() -> None:
    """Both modes must return identical data so the comparison is fair."""
    spec = importlib.util.spec_from_file_location("mcp_server_tools", MCP_TOOLS_FILE)
    assert spec and spec.loader
    mcp_tools = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mcp_tools)

    assert mcp_tools.WEATHER_DATA == weather.WEATHER_DATA
    assert mcp_tools.FALLBACK_WEATHER == weather.FALLBACK_WEATHER
    for expression in ["42 * 17", "2 ** 8", "7 / 2", "bad"]:
        assert mcp_tools.calculate(expression) == calculator.calculate(expression)
