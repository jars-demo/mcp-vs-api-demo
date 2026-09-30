"""
The MCP client side of MCP mode.

The backend is an MCP *client*. It connects to the MCP server over HTTP,
asks which tools exist (`tools/list`) and runs them (`tools/call`).
Everything goes through the Model Context Protocol.

Hosted on Vercel there is no separate long-running MCP server process, so
MCP_TRANSPORT=inprocess loads the same server into this process and talks to
it over an in-memory transport. The protocol messages are identical; only
the network hop is gone.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

from mcp import Client
from mcp.types import CallToolResult, Implementation, Tool

from shared.config import get_settings

CLIENT_INFO = Implementation(name="mcp-vs-api-backend", version="1.0.0")
MCP_SERVER_DIR = Path(__file__).resolve().parents[2] / "mcp-server"


def transport_label() -> str:
    return "in-process (Vercel)" if get_settings().mcp_transport == "inprocess" else "Streamable HTTP"


def open_client(url: str) -> Client:
    """
    Create an MCP client for the server at `url` (Streamable HTTP transport).

    Use it as `async with open_client(url) as client:`. Entering the block
    connects to the server and negotiates the protocol version.
    Response caching is off so every run really sends `tools/list`.
    """
    if get_settings().mcp_transport == "inprocess":
        return _open_in_process_client()
    return Client(url, cache=None, read_timeout_seconds=20, client_info=CLIENT_INFO)


def _open_in_process_client() -> Client:
    """Load mcp-server/server.py and connect to it with JSON-RPC over in-memory streams."""
    if str(MCP_SERVER_DIR) not in sys.path:
        sys.path.insert(0, str(MCP_SERVER_DIR))
    import server  # mcp-server/server.py

    return Client(server.mcp, mode="legacy", cache=None, read_timeout_seconds=20, client_info=CLIENT_INFO)


def tool_schema(tool: Tool) -> dict[str, Any]:
    """The tool exactly as the MCP server described it."""
    return {"name": tool.name, "description": tool.description or "", "inputSchema": tool.input_schema}


def to_groq_tool(tool: Tool) -> dict[str, Any]:
    """
    Translate an MCP tool into the function-calling format Groq expects.

    This is the bridge between the two worlds: MCP describes a tool with
    `inputSchema`, the model API calls the same JSON Schema `parameters`.
    """
    return {
        "type": "function",
        "function": {
            "name": tool.name,
            "description": tool.description or "",
            "parameters": tool.input_schema,
        },
    }


def parse_tool_result(result: CallToolResult) -> dict[str, Any]:
    """Turn an MCP `tools/call` result into a plain dict for the model."""
    if result.structured_content is not None and not result.is_error:
        return dict(result.structured_content)
    text = "".join(block.text for block in result.content if getattr(block, "type", "") == "text")
    if result.is_error:
        return {"error": text or "The tool reported an error"}
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {"result": text}
    return parsed if isinstance(parsed, dict) else {"result": parsed}
