"""
Vercel entry point.

Vercel runs this file as a Python serverless function and serves the React
build as static files. Locally you never need this file: use `python app.py`
in backend/ and `python server.py` in mcp-server/ instead.

On Vercel there is no separate long-running MCP server process, so the
backend loads mcp-server/server.py in the same process and still talks to it
through the MCP protocol (tools/list, tools/call) over an in-memory transport.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "backend"))

os.environ.setdefault("MCP_TRANSPORT", "inprocess")

from app import app  # noqa: E402  (backend/app.py)

__all__ = ["app"]
