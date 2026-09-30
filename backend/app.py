"""
FastAPI backend for the MCP vs API workshop.

Run it with:

    python app.py

Endpoints:

    GET  /health               -> {"status": "ok"}
    GET  /api/status           -> Groq + MCP server status, discovered tools
    POST /api/api-mode/chat    -> streams API mode events (Server-Sent Events)
    POST /api/mcp-mode/chat    -> streams MCP mode events (Server-Sent Events)
"""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import AsyncIterator, Awaitable, Callable
from typing import Any

import uvicorn
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from api_mode import service as api_service
from api_mode.tools import TOOL_DEFINITIONS
from mcp_mode import client as mcp_client
from mcp_mode import service as mcp_service
from shared.config import get_settings
from shared.events import Emit, Event

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s: %(message)s")
logger = logging.getLogger("backend")

MAX_MESSAGE_LENGTH = 500
MCP_STATUS_TIMEOUT_SECONDS = 5

app = FastAPI(
    title="MCP vs API Workshop",
    description="Run the same AI request through an API integration and through MCP.",
    version="1.0.0",
)


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH, examples=["What's the weather in Mumbai?"])

    @field_validator("message")
    @classmethod
    def not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("message must not be blank")
        return value


# ─────────────────────────────────────────────────────────────
#  Health + status
# ─────────────────────────────────────────────────────────────


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/status")
async def status() -> dict[str, Any]:
    """Status for the UI. Never includes the Groq API key itself."""
    settings = get_settings()
    return {
        "backend": "ok",
        "groq": {"configured": settings.groq_configured, "model": settings.groq_model},
        "mcp": await _mcp_status(settings.mcp_server_url),
        "mcp_transport": mcp_client.transport_label(),
        "api_tools": TOOL_DEFINITIONS,
    }


async def _mcp_status(url: str) -> dict[str, Any]:
    if get_settings().mcp_transport == "inprocess":
        url = "in-process"

    async def discover() -> dict[str, Any]:
        async with mcp_client.open_client(url) as client:
            listing = await client.list_tools()
            server = client.server_info
            return {
                "connected": True,
                "url": url,
                "server": server.model_dump(exclude_none=True) if server else None,
                "tools": [mcp_client.tool_schema(tool) for tool in listing.tools],
            }

    try:
        return await asyncio.wait_for(discover(), timeout=MCP_STATUS_TIMEOUT_SECONDS)
    except Exception:  # noqa: BLE001 - offline is an expected state, not an error
        return {"connected": False, "url": url, "server": None, "tools": []}


# ─────────────────────────────────────────────────────────────
#  Chat endpoints (streamed with Server-Sent Events)
# ─────────────────────────────────────────────────────────────

Runner = Callable[[str, Emit], Awaitable[None]]


async def _sse(runner: Runner, message: str) -> AsyncIterator[str]:
    """
    Run a mode in the background and forward each event as it happens.

    The mode pushes events into a queue; this generator pops them and
    writes them to the HTTP response as `data: {...}` lines.
    """
    queue: asyncio.Queue[Event | None] = asyncio.Queue()

    async def worker() -> None:
        try:
            await runner(message, queue.put)
        finally:
            await queue.put(None)

    task = asyncio.create_task(worker())
    try:
        while (event := await queue.get()) is not None:
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
    finally:
        if not task.done():
            task.cancel()


def _stream(runner: Runner, message: str) -> StreamingResponse:
    return StreamingResponse(
        _sse(runner, message),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/api/api-mode/chat")
async def api_mode_chat(request: ChatRequest) -> StreamingResponse:
    logger.info("API mode request (%d chars)", len(request.message))
    return _stream(api_service.run, request.message)


@app.post("/api/mcp-mode/chat")
async def mcp_mode_chat(request: ChatRequest) -> StreamingResponse:
    logger.info("MCP mode request (%d chars)", len(request.message))
    return _stream(mcp_service.run, request.message)


if __name__ == "__main__":
    settings = get_settings()
    if not settings.groq_configured:
        logger.warning("GROQ_API_KEY is not set. Add it to backend/.env to run the model.")
    logger.info("Backend running on http://127.0.0.1:%d  (docs: /docs)", settings.backend_port)
    uvicorn.run(app, host="127.0.0.1", port=settings.backend_port)
