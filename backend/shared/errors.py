"""Friendly errors that the UI can show without leaking stack traces."""

from __future__ import annotations

import groq


class WorkshopError(Exception):
    """An error with a short message and a hint on how to fix it."""

    def __init__(self, code: str, message: str, hint: str, technical: str | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.hint = hint
        self.technical = technical


def groq_not_configured() -> WorkshopError:
    return WorkshopError(
        "groq_not_configured",
        "Groq API key not configured.",
        "Add GROQ_API_KEY to backend/.env and restart the backend.",
    )


def mcp_unavailable(technical: str | None = None) -> WorkshopError:
    return WorkshopError(
        "mcp_unavailable",
        "MCP server unavailable.",
        "Start the MCP server and try again.",
        technical,
    )


def _first_leaf(exc: BaseException) -> BaseException:
    """Task groups can wrap errors in an ExceptionGroup. Return the first real error."""
    while isinstance(getattr(exc, "exceptions", None), (list, tuple)) and exc.exceptions:  # type: ignore[attr-defined]
        exc = exc.exceptions[0]  # type: ignore[attr-defined]
    return exc


def describe(exc: BaseException) -> str:
    """Short technical description for presenter mode (never includes secrets)."""
    leaf = _first_leaf(exc)
    return f"{type(leaf).__name__}: {leaf}"[:500]


def to_workshop_error(exc: BaseException) -> WorkshopError:
    """Translate any exception into a WorkshopError."""
    exc = _first_leaf(exc)
    if isinstance(exc, WorkshopError):
        return exc
    technical = describe(exc)
    if isinstance(exc, groq.AuthenticationError):
        return WorkshopError("groq_auth", "Groq rejected the API key.", "Check GROQ_API_KEY in backend/.env.", technical)
    if isinstance(exc, groq.RateLimitError):
        return WorkshopError("groq_rate_limit", "Groq rate limit reached.", "Wait a few seconds and try again.", technical)
    if isinstance(exc, groq.NotFoundError):
        return WorkshopError("groq_model", "Groq model not found.", "Check GROQ_MODEL in backend/.env.", technical)
    if isinstance(exc, (groq.APIConnectionError, groq.APITimeoutError)):
        return WorkshopError("groq_unreachable", "Could not reach Groq.", "Check your internet connection.", technical)
    if isinstance(exc, groq.APIError):
        return WorkshopError(
            "groq_error",
            "Groq could not complete the request.",
            "Try again, or set a different GROQ_MODEL in backend/.env.",
            technical,
        )
    return WorkshopError("internal_error", "Something went wrong.", "Check the backend terminal for details.", technical)
