"""
Shared test helpers.

Tests never call the real Groq API. `FakeGroq` replays scripted replies,
so the tool-calling loop can be tested without an API key.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

import app as backend_app  # noqa: E402
from shared import groq_client  # noqa: E402


def tool_call_reply(name: str, arguments: dict[str, Any], call_id: str = "call_1") -> SimpleNamespace:
    """A fake assistant message that asks for one tool call."""
    call = SimpleNamespace(id=call_id, function=SimpleNamespace(name=name, arguments=json.dumps(arguments)))
    return SimpleNamespace(content=None, tool_calls=[call])


def text_reply(text: str) -> SimpleNamespace:
    """A fake assistant message with a plain answer."""
    return SimpleNamespace(content=text, tool_calls=None)


class FakeGroq:
    """Minimal stand-in for AsyncGroq: returns scripted replies in order."""

    def __init__(self, replies: list[SimpleNamespace]) -> None:
        self.replies = list(replies)
        self.requests: list[dict[str, Any]] = []
        self.chat = SimpleNamespace(completions=SimpleNamespace(create=self._create))

    async def _create(self, **request: Any) -> SimpleNamespace:
        self.requests.append(request)
        return SimpleNamespace(choices=[SimpleNamespace(message=self.replies.pop(0))])


@pytest.fixture
def client() -> TestClient:
    return TestClient(backend_app.app)


@pytest.fixture(autouse=True)
def isolated_env(monkeypatch: pytest.MonkeyPatch) -> None:
    """Never use the developer's real .env values in tests."""
    monkeypatch.setenv("GROQ_API_KEY", "")
    monkeypatch.setenv("GROQ_MODEL", "test-model")
    # Port 9 (discard) is closed on normal machines, so MCP looks offline by default.
    monkeypatch.setenv("MCP_SERVER_URL", "http://127.0.0.1:9/mcp")


@pytest.fixture
def fake_groq(monkeypatch: pytest.MonkeyPatch):
    """Install a FakeGroq with the given replies: `fake_groq([reply, reply])`."""

    def install(replies: list[SimpleNamespace]) -> FakeGroq:
        fake = FakeGroq(replies)
        monkeypatch.setattr(groq_client, "create_groq_client", lambda: fake)
        return fake

    return install


def read_events(response: Any) -> list[dict[str, Any]]:
    """Parse a Server-Sent Events response body into a list of events."""
    return [json.loads(line[len("data: "):]) for line in response.text.splitlines() if line.startswith("data: ")]


def final_steps(events: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Latest version of each step, keyed by step_id."""
    steps: dict[str, dict[str, Any]] = {}
    for event in events:
        if event["type"] == "step":
            steps[event["step_id"]] = event
    return steps
