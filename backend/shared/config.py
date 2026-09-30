"""Settings loaded from backend/.env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BACKEND_DIR / ".env")

DEFAULT_MODEL = "llama-3.3-70b-versatile"
DEFAULT_MCP_SERVER_URL = "http://127.0.0.1:8001/mcp"


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_model: str
    mcp_server_url: str
    backend_port: int

    @property
    def groq_configured(self) -> bool:
        return bool(self.groq_api_key)


def get_settings() -> Settings:
    """Read settings from the environment (re-read on every call, which keeps tests simple)."""
    return Settings(
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        groq_model=os.getenv("GROQ_MODEL", "").strip() or DEFAULT_MODEL,
        mcp_server_url=os.getenv("MCP_SERVER_URL", "").strip() or DEFAULT_MCP_SERVER_URL,
        backend_port=int(os.getenv("BACKEND_PORT", "").strip() or 8000),
    )
