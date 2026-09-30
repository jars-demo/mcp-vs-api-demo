"""Tests for the HTTP endpoints, input validation and both modes."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from mcp import Client

from conftest import FakeGroq, final_steps, read_events, text_reply, tool_call_reply
from mcp_mode import client as mcp_client

MCP_SERVER_DIR = Path(__file__).resolve().parents[2] / "mcp-server"


# ─── Health & status ─────────────────────────────────────────


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_status_never_exposes_the_api_key(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("GROQ_API_KEY", "gsk_super_secret_value")
    response = client.get("/api/status")
    body = response.json()
    assert body["groq"]["configured"] is True
    assert "gsk_super_secret_value" not in response.text
    assert body["mcp"]["connected"] is False
    assert [tool["function"]["name"] for tool in body["api_tools"]] == ["get_weather", "calculate"]


# ─── Input validation ────────────────────────────────────────


@pytest.mark.parametrize("path", ["/api/api-mode/chat", "/api/mcp-mode/chat"])
@pytest.mark.parametrize("body", [{}, {"message": ""}, {"message": "   "}, {"message": "x" * 501}, {"message": 42}])
def test_chat_rejects_invalid_input(client: TestClient, path: str, body: dict) -> None:
    assert client.post(path, json=body).status_code == 422


# ─── API mode ────────────────────────────────────────────────


def test_api_mode_without_groq_key_reports_friendly_error(client: TestClient) -> None:
    events = read_events(client.post("/api/api-mode/chat", json={"message": "What's the weather in Mumbai?"}))
    error = events[-1]
    assert error["type"] == "error"
    assert error["code"] == "groq_not_configured"
    assert error["message"] == "Groq API key not configured."
    assert final_steps(events)["model"]["status"] == "error"


def test_api_mode_runs_the_tool_the_model_chose(client: TestClient, fake_groq) -> None:
    fake: FakeGroq = fake_groq(
        [tool_call_reply("get_weather", {"city": "Mumbai"}), text_reply("It is 29°C and partly cloudy (demo data).")]
    )
    events = read_events(client.post("/api/api-mode/chat", json={"message": "What's the weather in Mumbai?"}))
    steps = final_steps(events)

    assert list(steps) == ["user", "backend", "model", "tool", "data", "model_final", "response"]
    assert all(step["status"] == "success" for step in steps.values())
    assert steps["backend"]["title"] == "POST /api/api-mode/chat"
    assert steps["tool"]["title"] == 'get_weather(city="Mumbai")'
    assert steps["data"]["title"] == "Mumbai · 29°C · Partly cloudy"
    assert events[-1] == {**events[-1], "type": "done", "answer": "It is 29°C and partly cloudy (demo data)."}

    # The model received the tool definitions and, later, the tool result.
    assert fake.requests[0]["tool_choice"] == "auto"
    assert fake.requests[1]["messages"][-1]["role"] == "tool"


def test_api_mode_model_can_answer_without_a_tool(client: TestClient, fake_groq) -> None:
    fake_groq([text_reply("Why did the developer go broke? Because he used up all his cache.")])
    events = read_events(client.post("/api/api-mode/chat", json={"message": "Tell me a joke."}))
    steps = final_steps(events)
    assert list(steps) == ["user", "backend", "model", "response"]
    assert steps["model"]["title"] == "Groq answered directly"
    assert events[-1]["type"] == "done"


# ─── MCP mode ────────────────────────────────────────────────


def test_mcp_mode_reports_offline_server(client: TestClient) -> None:
    events = read_events(client.post("/api/mcp-mode/chat", json={"message": "What's the weather in Mumbai?"}))
    assert events[-1]["type"] == "error"
    assert events[-1]["code"] == "mcp_unavailable"
    assert events[-1]["message"] == "MCP server unavailable."
    assert final_steps(events)["client"]["status"] == "error"


@pytest.fixture
def in_process_mcp_server(monkeypatch: pytest.MonkeyPatch) -> None:
    """Connect the backend's MCP client to the real MCP server code, in-process.

    Requests still go through the MCP protocol (tools/list, tools/call);
    only the network hop is skipped.
    """
    monkeypatch.syspath_prepend(str(MCP_SERVER_DIR))
    sys.modules.pop("tools", None)
    import server  # the MCP server from mcp-server/server.py

    monkeypatch.setattr(mcp_client, "open_client", lambda url: Client(server.mcp, cache=None))


def test_mcp_mode_discovers_and_calls_tools_through_mcp(client: TestClient, fake_groq, in_process_mcp_server) -> None:
    fake: FakeGroq = fake_groq(
        [tool_call_reply("get_weather", {"city": "Mumbai"}), text_reply("It is 29°C in Mumbai (demo data).")]
    )
    events = read_events(client.post("/api/mcp-mode/chat", json={"message": "What's the weather in Mumbai?"}))
    steps = final_steps(events)

    assert list(steps) == [
        "user", "client", "tools_list", "discovery", "model",
        "tools_call", "server", "result", "model_final", "response",
    ]  # fmt: skip
    assert all(step["status"] == "success" for step in steps.values())
    assert steps["tools_list"]["title"] == "tools/list"
    assert steps["tools_call"]["title"] == "tools/call"
    assert steps["discovery"]["title"] == "get_weather, calculate discovered"
    assert steps["server"]["title"] == 'get_weather(city="Mumbai")'
    assert steps["result"]["title"] == "Mumbai · 29°C · Partly cloudy"
    assert events[-1]["type"] == "done"

    # The tools given to the model came from tools/list, not from api_mode/tools.py.
    offered = [tool["function"]["name"] for tool in fake.requests[0]["tools"]]
    assert offered == ["get_weather", "calculate"]
    assert "inputSchema" not in fake.requests[0]["tools"][0]["function"]


def test_mcp_mode_without_groq_key_still_shows_discovery(client: TestClient, in_process_mcp_server) -> None:
    events = read_events(client.post("/api/mcp-mode/chat", json={"message": "What is 42 * 17?"}))
    steps = final_steps(events)
    assert steps["tools_list"]["status"] == "success"
    assert steps["model"]["status"] == "error"
    assert events[-1]["code"] == "groq_not_configured"
