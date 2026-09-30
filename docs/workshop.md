# Workshop Guide

A companion for the live session. The same content is in the app at **/workshop**.
Suggested length: 60 to 90 minutes.

| Time | Section |
| --- | --- |
| 0:00 | 01 to 04: concepts (APIs → tool calling → the integration problem → MCP) |
| 0:20 | 05 to 07: live demo in the simulator |
| 0:35 | 08: hands-on exercise |
| 1:05 | 09: build your own tool and open a PR |

---

## 01 — APIs

An API is a contract for using a capability: an HTTP endpoint, an SDK method or a plain function. The application decides **when** to call it and **how**.

```python
weather = get_weather("Mumbai")          # a function
# or: GET https://api.example.com/weather?city=Mumbai
```

Nothing here needs AI. The developer wired the call in advance.

## 02 — LLM Tool Calling

You describe tools to the model: a name, a description and a JSON Schema. The **model** decides whether a tool is needed and returns a tool call. Your code runs it and sends the result back.

```text
User prompt
   ↓
Model: "I need get_weather(city=Mumbai)"
   ↓
Your code runs get_weather()
   ↓
Model writes the final answer
```

Ask *"Tell me a joke."* and the model answers without a tool. That decision is why tool calling exists.

## 03 — The Integration Problem

Tool calling tells the model *what* tools exist, but every application still writes its own glue: schemas, invocation code, error handling. Three AI apps that need the same five tools each write that glue again. Changing a tool means changing every app that hard-coded it.

## 04 — MCP

The **Model Context Protocol** is an open protocol that standardizes how AI applications discover and call capabilities.

- An **MCP server** exposes tools.
- An **MCP client** lists them with `tools/list` and runs them with `tools/call`.

> **MCP does not replace APIs.** MCP can sit above APIs. The tool behind an MCP server usually calls one: `get_weather()` → REST API, `get_customer()` → PostgreSQL, `create_ticket()` → Jira API.

## 05 — Run API Mode

1. Open **/simulator**. Keep the prompt *"What's the weather in Mumbai?"*
2. Click **Run API**.
3. Watch `POST /api/api-mode/chat` → Groq chooses `get_weather` → a direct Python function call.
4. Open `backend/api_mode/tools.py`: schema and function are both written inside the application.

**Takeaway:** the application controls the integration.

## 06 — Run MCP Mode

1. Make sure the MCP server is running (`python server.py` in `mcp-server/`).
2. Click **Run MCP**.
3. Watch: MCP client initialized → `tools/list` → tools discovered → Groq chooses → `tools/call` → server runs the tool.
4. Expand steps to see real payloads. Turn on **Presenter Mode** for timestamps and the raw event stream.
5. Open `mcp-server/server.py` (create → register → implement → run) and `backend/mcp_mode/service.py`.

**Takeaway:** the backend learned about the tools at runtime, through a standard protocol.

## 07 — Compare the Architectures

Click **Run Both**. *Same user request. Different integration path.*

| Concept | API Integration | MCP |
| --- | --- | --- |
| Primary abstraction | Endpoint / function | Protocol |
| Tool discovery | Application-defined | Standardized MCP mechanism |
| Invocation | Application / API call | MCP tool call |
| Reusability | Depends on the integration | Designed for reusable tool exposure |
| Can use APIs internally | Yes | Yes |
| AI-specific protocol | Not necessarily | Yes |

Neither is automatically better. They solve different problems.

Things worth pointing out live:

- Try *"Tell me a joke."*: both models answer directly and the tool steps show as **Skipped**.
- Try *"What is 42 × 17?"*: the model picks `calculate`, a tool that is plain logic, not an HTTP API.
- Stop the MCP server and click **Run MCP**: you get a clear "MCP server unavailable" error while API mode keeps working.

## 08 — Hands-on Exercise

Add `get_time(city)` to the MCP server. See [exercises.md](exercises.md). Restart the server and watch the new tool appear in `tools/list` **without changing the backend**.

## 09 — Build Your Own Tool

```text
Fork → branch → add your MCP tool → update docs → test → commit → push → Pull Request
```

See [contributing.md](contributing.md) and [extending.md](extending.md).

---

## Presenter checklist

- [ ] `python setup.py` done, `GROQ_API_KEY` set in `backend/.env`
- [ ] Three terminals running (MCP server, backend, frontend), or `python setup.py --run`
- [ ] Header shows **Backend ● Connected · MCP Server ● Connected · Groq ● Configured**
- [ ] Browser zoom at 125 to 150% for projection
- [ ] Presenter Mode on when explaining payloads, off for the clean view
