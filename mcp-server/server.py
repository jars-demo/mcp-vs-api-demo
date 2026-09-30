"""
A tiny MCP server.

Read this file top to bottom:

    1. create server
    2. register tools
    3. implement tools   (the real logic lives in tools.py)
    4. run server

Run it with:

    python server.py

It listens on http://127.0.0.1:8001/mcp using the "Streamable HTTP"
transport, so the FastAPI backend can connect to it over the network.
"""

from __future__ import annotations

import os
from typing import Annotated, Any

from dotenv import load_dotenv
from mcp.server.mcpserver import MCPServer
from pydantic import Field

import tools

load_dotenv()

HOST = os.getenv("MCP_HOST", "127.0.0.1")
PORT = int(os.getenv("MCP_PORT", "8001"))

# ─────────────────────────────────────────────────────────────
#  1. Create the server
# ─────────────────────────────────────────────────────────────

mcp = MCPServer(
    name="workshop-tools",
    instructions="Demo tools for the MCP vs API workshop.",
    version="1.0.0",
)

# ─────────────────────────────────────────────────────────────
#  2. Register tools
#
#  @mcp.tool() turns a Python function into an MCP tool:
#    - the function name becomes the tool name
#    - the docstring becomes the tool description
#    - the type hints become the JSON input schema
#
#  Clients find these tools by sending `tools/list`
#  and run them by sending `tools/call`.
# ─────────────────────────────────────────────────────────────


@mcp.tool()
def get_weather(
    city: Annotated[str, Field(description="City name, for example Mumbai or London")],
) -> dict[str, Any]:
    """Get weather information for a city. Returns demo data, not live weather."""
    return tools.get_weather(city)


@mcp.tool()
def calculate(
    expression: Annotated[str, Field(description="Arithmetic expression, for example 42 * 17")],
) -> dict[str, Any]:
    """Evaluate a basic arithmetic expression (+ - * / // % ** and parentheses)."""
    return tools.calculate(expression)


# ─────────────────────────────────────────────────────────────
#  3. Implement tools
#
#  The actual logic lives in tools.py as plain Python functions.
#  Your turn: add a new tool above this box (see docs/exercises.md).
# ─────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────
#  4. Run the server
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"MCP server 'workshop-tools' listening on http://{HOST}:{PORT}/mcp")
    mcp.run("streamable-http", host=HOST, port=PORT)
