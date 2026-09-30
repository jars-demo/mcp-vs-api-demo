"""
Tests for the MCP server.

Most tests connect an MCP client to the server *in-process*: the requests
still go through the real MCP protocol (`tools/list`, `tools/call`), just
without a network. The last test starts `python server.py` for real.
"""

from __future__ import annotations

import asyncio
import json
import os
import socket
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

import pytest
from mcp import Client

SERVER_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(SERVER_DIR))

import server  # noqa: E402
import tools  # noqa: E402


async def _list_tools() -> dict[str, Any]:
    async with Client(server.mcp, cache=None) as client:
        result = await client.list_tools()
    return {tool.name: tool.model_dump(by_alias=True, exclude_none=True) for tool in result.tools}


async def _call_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    async with Client(server.mcp, cache=None) as client:
        result = await client.call_tool(name, arguments)
    assert result.is_error is False
    return json.loads(result.content[0].text)


def test_get_weather_is_discoverable() -> None:
    discovered = asyncio.run(_list_tools())
    assert "get_weather" in discovered
    assert "calculate" in discovered


def test_get_weather_schema() -> None:
    schema = asyncio.run(_list_tools())["get_weather"]
    assert schema["description"].startswith("Get weather information for a city")
    assert schema["inputSchema"]["type"] == "object"
    assert schema["inputSchema"]["properties"]["city"]["type"] == "string"
    assert schema["inputSchema"]["required"] == ["city"]


def test_get_weather_invocation() -> None:
    result = asyncio.run(_call_tool("get_weather", {"city": "Mumbai"}))
    assert result["city"] == "Mumbai"
    assert result["temperature_celsius"] == 29
    assert result["condition"] == "Partly cloudy"
    assert result["source"] == tools.DEMO_NOTE


def test_calculate_invocation() -> None:
    assert asyncio.run(_call_tool("calculate", {"expression": "42 * 17"}))["result"] == 714


def test_unknown_city_gets_fallback() -> None:
    result = tools.get_weather("  atlantis ")
    assert result["city"] == "Atlantis"
    assert result["temperature_celsius"] == tools.FALLBACK_WEATHER["temperature_celsius"]


@pytest.mark.parametrize(
    "expression",
    ["__import__('os').system('echo hi')", "open('x')", "a + 1", "2 ** 1000", "[1, 2]", ""],
)
def test_calculate_rejects_unsafe_or_invalid_input(expression: str) -> None:
    assert "error" in tools.calculate(expression)


def _free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return sock.getsockname()[1]


def test_server_starts_over_http() -> None:
    port = _free_port()
    env = {**os.environ, "MCP_HOST": "127.0.0.1", "MCP_PORT": str(port)}
    process = subprocess.Popen(
        [sys.executable, "server.py"],
        cwd=SERVER_DIR,
        env=env,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        url = f"http://127.0.0.1:{port}/mcp"

        async def discover() -> list[str]:
            async with Client(url, cache=None) as client:
                return [tool.name for tool in (await client.list_tools()).tools]

        deadline = time.monotonic() + 20
        while True:
            try:
                names = asyncio.run(discover())
                break
            except Exception:
                if time.monotonic() > deadline:
                    raise
                time.sleep(0.3)
        assert "get_weather" in names
    finally:
        process.terminate()
        process.wait(timeout=10)
