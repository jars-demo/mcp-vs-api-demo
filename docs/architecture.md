# Architecture

The project is intentionally small: one React app, one FastAPI backend, one MCP server.

```text
┌──────────────────────┐
│      React UI        │   frontend/  (Vite + TypeScript + Tailwind)
│      Vite + TS       │
└──────────┬───────────┘
           │  POST /api/{api,mcp}-mode/chat  →  Server-Sent Events
           ▼
┌──────────────────────┐
│       FastAPI        │   backend/app.py
│       Backend        │
└───────┬───────┬──────┘
        │       │
     API Mode  MCP Mode
        │       │
        ▼       ▼
    Groq LLM  Groq LLM + MCP Client
        │                │  tools/list · tools/call (Streamable HTTP)
        ▼                ▼
  get_weather()      MCP Server        mcp-server/server.py
  (Python function)      │
                         ▼
                   get_weather()       mcp-server/tools.py
```

## The two paths

### API mode (`backend/api_mode/`)

```text
React → FastAPI → Groq → get_weather() → mock data → Groq → response
```

| Step | Where |
| --- | --- |
| Tool definitions (JSON Schema) are written by hand | `api_mode/tools.py` → `TOOL_DEFINITIONS` |
| Groq decides whether to call a tool | `shared/groq_client.py` → `ask_model()` |
| The backend calls its own function | `api_mode/tools.py` → `run_tool()` |
| Result goes back to Groq | `api_mode/service.py` |

### MCP mode (`backend/mcp_mode/`)

```text
React → FastAPI → MCP client → tools/list → Groq → tools/call → MCP server → get_weather() → Groq → response
```

| Step | Where |
| --- | --- |
| Connect to the MCP server | `mcp_mode/client.py` → `open_client()` |
| Discover tools (`tools/list`) | `mcp_mode/service.py` → `_conversation()` |
| Convert MCP tools to Groq's format | `mcp_mode/client.py` → `to_groq_tool()` |
| Groq decides whether to call a tool | `shared/groq_client.py` → `ask_model()` |
| Run the tool (`tools/call`) | `mcp_mode/service.py` → `_call_tool()` |
| The tool runs on the server | `mcp-server/server.py` + `mcp-server/tools.py` |

The backend **never imports** the MCP server's code. Everything goes through the protocol, so the MCP server could be written in another language, run on another machine, or be replaced by any other MCP server.

## Why both modes share so much

Both modes use the same model (`GROQ_MODEL`), the same system prompt, the same tool-calling loop and equivalent demo data (a test enforces that the two copies of the data are identical). The **only** difference is where the tools come from and how they are executed. That keeps the comparison fair.

## Transport

The MCP server uses the **Streamable HTTP** transport (`http://127.0.0.1:8001/mcp`), so it runs as its own process in its own terminal, like a real service. MCP also supports a **stdio** transport, where the client launches the server as a subprocess. That is common for desktop AI apps, but a separate process is easier to see in a workshop.

The backend opens a fresh MCP session for each run and disables client-side caching, so `tools/list` really goes over the wire every time you click **Run MCP**.

## Event streaming

The UI does not fake anything. Each mode calls `timeline.step(...)` as work happens. `backend/app.py` forwards those events to the browser as Server-Sent Events (`data: {...}\n\n`). The browser reads the POST response body with `fetch` (`frontend/src/lib/api.ts`) because `EventSource` only supports GET.

Event schema (see `backend/shared/events.py` and `frontend/src/types/events.ts`):

```json
{
  "type": "step",
  "mode": "mcp",
  "step_id": "tools_call",
  "stage": "mcp",
  "title": "tools/call",
  "description": "Asking the MCP server to run get_weather.",
  "status": "running",
  "node": "mcp_client",
  "details": { "request": { "jsonrpc": "2.0", "method": "tools/call", "params": { "name": "get_weather", "arguments": { "city": "Mumbai" } } } },
  "timestamp": "2026-09-30T10:00:00.123+00:00",
  "elapsed_ms": 812
}
```

A step is sent as `running` and then again with the same `step_id` as `success` or `error`. Repeated steps get a suffix (`tool#2`). A run ends with one `done` event (`answer`) or one `error` event (`code`, `message`, `hint`, `technical`).

## MCP does not replace APIs

In this demo, the MCP tool returns mock data. In a real system, the tool behind the MCP server usually calls something else:

```text
MCP Server
    ↓
get_weather()
    ↓
Could call:
    ↓
REST API
```

```text
MCP Server
    ↓
get_customer()
    ↓
Could call:
    ↓
PostgreSQL
```

```text
MCP Server
    ↓
create_ticket()
    ↓
Could call:
    ↓
Jira API
```

MCP standardizes how AI applications **discover and call** those capabilities. It sits above APIs, not instead of them.

## Security notes

- The Groq key lives only in `backend/.env` (git-ignored) and is never sent to the browser or logged.
- Chat input is validated (1 to 500 characters). The model loop is capped at 3 tool rounds.
- The calculator parses expressions into a syntax tree and only allows arithmetic, so it never uses `eval()`.
- No shell execution and no filesystem access in any tool.
- Both servers bind to `127.0.0.1` only.
