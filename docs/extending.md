# Extending the Project

Where everything lives, so you can keep building after the workshop.

## A new MCP tool

**Files:** `mcp-server/tools.py`, `mcp-server/server.py`, `mcp-server/tests/test_server.py`

1. Write a plain function in `mcp-server/tools.py`:

   ```python
   def convert_units(value: float, from_unit: str, to_unit: str) -> dict[str, Any]:
       """Convert between km/miles, kg/lb and celsius/fahrenheit."""
       ...
   ```

2. Register it in `mcp-server/server.py`, in section *2. Register tools*:

   ```python
   @mcp.tool()
   def convert_units(
       value: Annotated[float, Field(description="The number to convert")],
       from_unit: Annotated[str, Field(description="Unit to convert from, e.g. km")],
       to_unit: Annotated[str, Field(description="Unit to convert to, e.g. miles")],
   ) -> dict[str, Any]:
       """Convert a value between common units."""
       return tools.convert_units(value, from_unit, to_unit)
   ```

   - The **function name** becomes the tool name.
   - The **docstring** becomes the description the model reads.
   - The **type hints** (plus `Field(description=...)`) become the JSON input schema.

3. Restart `python server.py`. The tool appears in **Available MCP Tools** and in `tools/list`. **The backend needs no changes.**

4. Add tests (copy `test_get_weather_schema` and `test_get_weather_invocation`).

Tips: return errors as data (`{"error": "..."}`) so the model can explain them, and keep outputs small and JSON-friendly.

## A new API-mode tool

**File:** `backend/api_mode/tools.py`

API mode only knows the tools the application defines. To add one:

1. Implement the function (put shared logic in `backend/shared/`).
2. Add its schema to `TOOL_DEFINITIONS` (Groq/OpenAI function-calling format).
3. Map its name in `TOOL_FUNCTIONS`.
4. Add tests in `backend/tests/test_tools.py`. `test_every_api_tool_has_a_function` catches a missing mapping.

Doing this for the same tool you added to the MCP server is a good way to *feel* the difference between the two approaches.

Optional: teach the timeline a nicer one-line summary for your tool in `summarize_tool_result()` (`backend/shared/events.py`). Without that, a compact JSON summary is shown.

## A new frontend preset

**File:** `frontend/src/lib/presets.ts`

```ts
export const PRESET_PROMPTS: string[] = [
  "What's the weather in Mumbai?",
  // ...
  "Convert 10 km to miles.",
];
```

Presets only fill the input. They never run automatically.

## A new execution event

**Backend:** `backend/shared/events.py` · **Frontend types:** `frontend/src/types/events.ts` · **Timeline template:** `frontend/src/lib/timeline.ts`

Emit a step from a mode's `service.py`:

```python
await timeline.step(
    "my_step",                 # step_id: reuse it to move running → success
    "server",                  # stage: picks the icon (see STAGE_ICONS in Timeline.tsx)
    "Title shown in the row",
    "One-sentence description.",
    "running",                 # "running" | "success" | "error"
    node="mcp_server",         # architecture node to highlight (optional)
    details={"anything": "JSON-serializable"},  # shown when the row is expanded
)
```

Event types:

| `type` | Fields | Meaning |
| --- | --- | --- |
| `step` | `step_id`, `stage`, `title`, `description`, `status`, `node`, `details`, `timestamp`, `elapsed_ms` | A timeline row was added or updated |
| `error` | `code`, `message`, `hint`, `technical` | The run failed; the UI shows `message` + `hint` |
| `done` | `answer`, `elapsed_ms` | The run finished |

To show a new step as *Pending* before it happens, add it to `TEMPLATES` in `frontend/src/lib/timeline.ts` with the same `step_id`. To give it a new icon, add the stage to `STAGE_ICONS` in `frontend/src/components/Timeline.tsx`.

## A new exercise

Exercises live in two places, kept in sync:

- `docs/exercises.md`: for reading on GitHub
- `frontend/src/pages/ExercisesPage.tsx`: the in-app page with collapsible hints and solutions

Keep solutions tested: before you open a PR, paste your solution into a scratch copy of `mcp-server/` and run `python -m pytest`.

## A new workshop section

- `docs/workshop.md`
- `frontend/src/pages/WorkshopPage.tsx` (add to `SECTIONS`, then add a `<Section index={n}>`)

## Swapping the LLM provider

Only `backend/shared/groq_client.py` knows about Groq. Any provider with OpenAI-style tool calling can replace `create_groq_client()` and `ask_model()`. The rest of the backend is provider-agnostic.

## Making `get_weather` real

Replace the body of `get_weather()` in `mcp-server/tools.py` with a call to a real weather API (for example with `httpx`). Nothing else changes: that is the "MCP sits above APIs" idea in practice. Keep any API key in `mcp-server/.env`, never in code.
