"""
MCP mode: tools come from an MCP server through a standard protocol.

    React -> FastAPI -> MCP client -> tools/list -> Groq -> tools/call
          -> MCP server -> get_weather() -> MCP client -> Groq -> answer

The backend has no hard-coded tool list here. It:

    1. connects to the MCP server
    2. discovers tools (tools/list)
    3. gives those tools to the model
    4. lets Groq choose a tool
    5. calls the tool through MCP (tools/call)
    6. receives the result
    7. sends the result back to the model
    8. returns the final answer
"""

from __future__ import annotations

import logging
from contextlib import AsyncExitStack
from typing import Any

from mcp import Client

from mcp_mode import client as mcp_client
from shared import groq_client
from shared.config import get_settings
from shared.errors import describe, mcp_unavailable, to_workshop_error
from shared.events import Emit, Timeline, format_call, summarize_tool_result

logger = logging.getLogger(__name__)

ENDPOINT = "/api/mcp-mode/chat"


async def run(message: str, emit: Emit) -> None:
    """Handle one chat request and stream every step to the browser."""
    timeline = Timeline("mcp", emit)
    answer: str | None = None
    try:
        async with AsyncExitStack() as stack:
            await timeline.step(
                "user",
                "user",
                "Prompt received",
                f'"{message}"',
                node="user",
                details={"request": {"method": "POST", "path": ENDPOINT, "body": {"message": message}}},
            )
            client = await _connect(stack, timeline)
            # Errors are handled *inside* the MCP session so they are reported
            # before the connection is closed.
            try:
                answer = await _conversation(client, message, timeline)
            except Exception as exc:  # noqa: BLE001 - every error becomes a friendly UI message
                await _fail(timeline, exc)
                return
    except Exception as exc:  # noqa: BLE001
        if answer is None:
            if not timeline.failed:
                await _fail(timeline, exc)
            return
        # The answer is ready; only closing the MCP session failed.
        logger.warning("MCP session did not close cleanly: %s", type(exc).__name__)
    await timeline.done(answer)


async def _fail(timeline: Timeline, exc: BaseException) -> None:
    error = to_workshop_error(exc)
    if error.code == "internal_error":
        logger.exception("MCP mode failed")
    await timeline.fail(error)


async def _connect(stack: AsyncExitStack, timeline: Timeline) -> Client:
    """Step 1: connect to the MCP server."""
    url = get_settings().mcp_server_url
    await timeline.step(
        "client",
        "client",
        "Connecting MCP client",
        f"Opening a session with the MCP server at {url}.",
        "running",
        node="mcp_client",
        details={"transport": "streamable-http", "url": url},
    )
    try:
        client = await stack.enter_async_context(mcp_client.open_client(url))
    except Exception as exc:  # noqa: BLE001
        raise mcp_unavailable(describe(exc)) from exc

    server = client.server_info
    await timeline.step(
        "client",
        "client",
        "MCP client initialized",
        f"Connected to '{server.name if server else 'MCP server'}' over Streamable HTTP.",
        node="mcp_client",
        details={
            "transport": "streamable-http",
            "url": url,
            "protocolVersion": client.protocol_version,
            "serverInfo": server.model_dump(exclude_none=True) if server else None,
        },
    )
    return client


async def _conversation(client: Client, message: str, timeline: Timeline) -> str:
    # Step 2: discover tools.
    await timeline.step(
        "tools_list",
        "mcp",
        "tools/list",
        "Asking the MCP server which tools it offers.",
        "running",
        node="mcp_server",
        details={"request": {"jsonrpc": "2.0", "method": "tools/list"}},
    )
    listing = await client.list_tools()
    schemas = [mcp_client.tool_schema(tool) for tool in listing.tools]
    await timeline.step(
        "tools_list",
        "mcp",
        "tools/list",
        f"The server returned {len(schemas)} tool(s).",
        node="mcp_server",
        details={"request": {"jsonrpc": "2.0", "method": "tools/list"}, "response": {"tools": schemas}},
    )

    # Step 3: expose the discovered tools to the model.
    groq_tools = [mcp_client.to_groq_tool(tool) for tool in listing.tools]
    names = [schema["name"] for schema in schemas]
    await timeline.step(
        "discovery",
        "discovery",
        f"{', '.join(names) or 'No tools'} discovered",
        "The backend did not hard-code these tools. It learned them from the MCP server.",
        node="mcp_client",
        details={"discovered": schemas, "converted_for_groq": groq_tools},
    )

    # Step 4: let the model decide.
    model = get_settings().groq_model
    await timeline.step(
        "model",
        "model",
        "Groq",
        f"Sending the prompt and {len(groq_tools)} discovered tools to {model}.",
        "running",
        node="groq",
        details={"model": model, "tool_choice": "auto", "tools": groq_tools},
    )
    groq = groq_client.create_groq_client()
    messages = groq_client.first_messages(message)
    model_step = "model"

    for round_number in range(1, groq_client.MAX_TOOL_ROUNDS + 1):
        is_last_round = round_number == groq_client.MAX_TOOL_ROUNDS
        reply = await groq_client.ask_model(groq, messages, None if is_last_round else groq_tools)

        if not reply.tool_calls:
            answer = (reply.content or "").strip()
            await timeline.answered(model_step, answer)
            return answer

        calls = groq_client.describe_tool_calls(reply)
        await timeline.step(
            model_step,
            "model",
            f"Groq decides to use {', '.join(call['name'] for call in calls)}",
            "The model picked a tool that it learned about through MCP.",
            node="groq",
            details={"tool_calls": calls},
        )

        # Steps 5 + 6: call each tool through MCP and collect the results.
        messages.append(groq_client.assistant_message(reply))
        for call in calls:
            result = await _call_tool(client, timeline, call["name"], call["arguments"])
            messages.append(groq_client.tool_message(call["id"], result))

        # Step 7: send the results back to the model.
        model_step = timeline.next_id("model_final")
        await timeline.step(
            model_step,
            "model",
            "Final response",
            "Sending the MCP tool result back to Groq to write the answer.",
            "running",
            node="groq",
        )

    raise RuntimeError("Model did not produce an answer")  # pragma: no cover


async def _call_tool(client: Client, timeline: Timeline, name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    request = {"jsonrpc": "2.0", "method": "tools/call", "params": {"name": name, "arguments": arguments}}
    call_step = timeline.next_id("tools_call")
    await timeline.step(
        call_step,
        "mcp",
        "tools/call",
        f"Asking the MCP server to run {name}.",
        "running",
        node="mcp_client",
        details={"request": request},
    )
    try:
        response = await client.call_tool(name, arguments)
    except Exception as exc:  # noqa: BLE001
        raise mcp_unavailable(describe(exc)) from exc

    result = mcp_client.parse_tool_result(response)
    raw_response = response.model_dump(by_alias=True, exclude_none=True, mode="json")
    await timeline.step(
        call_step,
        "mcp",
        "tools/call",
        f"The MCP server answered the {name} call.",
        node="mcp_client",
        details={"request": request},
    )
    await timeline.step(
        timeline.next_id("server"),
        "server",
        format_call(name, arguments),
        "The MCP server ran its own implementation of the tool and returned the result.",
        node="tool",
        details={"response": raw_response},
    )
    await timeline.step(
        timeline.next_id("result"),
        "result",
        summarize_tool_result(name, result),
        "Demo data — not live weather" if name == "get_weather" else "Returned by the MCP server",
        node="data",
        details={"result": result},
    )
    return result
