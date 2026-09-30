"""Settings loaded from backend/.env."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import dotenv_values

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent


def _load_env_files() -> None:
    """
    Load backend/.env, falling back to the project-root .env.

    A non-empty value in backend/.env wins. Real environment variables win over both.
    """
    backend = dotenv_values(BACKEND_DIR / ".env")
    root = dotenv_values(ROOT_DIR / ".env")
    for key in {**root, **backend}:
        value = backend.get(key) or root.get(key)
        if value and not os.environ.get(key):
            os.environ[key] = value


_load_env_files()

DEFAULT_MODEL = "openai/gpt-oss-120b"
DEFAULT_MCP_SERVER_URL = "http://127.0.0.1:8001/mcp"


@dataclass(frozen=True)
class Settings:
    groq_api_key: str
    groq_model: str
    mcp_server_url: str
    mcp_transport: str  # "http" = separate MCP server process, "inprocess" = same process (Vercel)
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
        mcp_transport="inprocess" if os.getenv("MCP_TRANSPORT", "").strip().lower() == "inprocess" else "http",
        backend_port=int(os.getenv("BACKEND_PORT", "").strip() or 8000),
    )
