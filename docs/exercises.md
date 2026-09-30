# Exercises

The same exercises are in the app at **/exercises**, with collapsible hints and solutions.

Before you start: `python setup.py` has run, and the MCP server, backend and frontend are running (see the [README](../README.md#quick-start)).

---

## Exercise 1: Add `get_time(city)` (~15 min)

Return the current local time for a city. No API key needed.

### Tasks

1. **Create the tool:** write a `get_time(city)` function in `mcp-server/tools.py`.
2. **Define the schema:** type hints plus a docstring (MCP generates the JSON Schema).
3. **Register it** with `@mcp.tool()` in `mcp-server/server.py`.
4. **Make it discoverable:** restart the MCP server and check the **Available MCP Tools** panel.
5. **Invoke it through MCP:** ask *"What time is it in London?"* and click **Run MCP**.
6. **Test it:** add a test and run `python -m pytest` in `mcp-server/`.

<details>
<summary><strong>Hints</strong></summary>

- Copy the shape of `get_weather`: a plain function in `tools.py`, a thin decorated wrapper in `server.py`.
- Use `datetime.now(timezone.utc) + timedelta(hours=offset)` with a small dict of UTC offsets.
- The docstring becomes the tool description. The model reads it to decide when to call your tool, so make it clear.
- You do **not** need to change the backend. MCP mode discovers the new tool through `tools/list`.

</details>

<details>
<summary><strong>Solution</strong></summary>

```python
# mcp-server/tools.py
# (put this import next to the other imports at the top of the file)
from datetime import datetime, timedelta, timezone


# Fixed UTC offsets (hours). Demo only: daylight saving time is ignored.
CITY_UTC_OFFSETS = {
    "Mumbai": 5.5, "Delhi": 5.5, "Bangalore": 5.5,
    "London": 0, "New York": -5, "Singapore": 8,
}


def get_time(city: str) -> dict[str, Any]:
    """Return the current local time in a city."""
    for known_city, offset in CITY_UTC_OFFSETS.items():
        if known_city.lower() == city.strip().lower():
            local = datetime.now(timezone.utc) + timedelta(hours=offset)
            return {
                "city": known_city,
                "local_time": local.strftime("%H:%M"),
                "utc_offset_hours": offset,
                "note": "Fixed UTC offset, daylight saving ignored",
            }
    return {"city": city, "error": "Unknown city"}
```

```python
# mcp-server/server.py  (next to get_weather and calculate)
@mcp.tool()
def get_time(
    city: Annotated[str, Field(description="City name, for example Mumbai or London")],
) -> dict[str, Any]:
    """Get the current local time in a city."""
    return tools.get_time(city)
```

```python
# mcp-server/tests/test_server.py
def test_get_time_is_discoverable() -> None:
    assert "get_time" in asyncio.run(_list_tools())


def test_get_time_invocation() -> None:
    result = asyncio.run(_call_tool("get_time", {"city": "London"}))
    assert result["city"] == "London"
    assert ":" in result["local_time"]
```

</details>

> **Notice what you did not touch.** API mode will not see `get_time` until someone edits `backend/api_mode/tools.py`. MCP mode picked it up from the server. Try adding it to API mode too and compare the two changes.

---

## Exercise 2: Add `get_exchange_rate(from_currency, to_currency)` (~20 min)

A more realistic tool: two arguments, input normalization and a helpful error for unsupported currencies. Use fixed demo rates, so no API key is needed.

### Tasks

1. Add a `RATES_IN_USD` dict and a `get_exchange_rate()` function to `tools.py`.
2. Accept lower-case codes like "usd" and return an error listing the supported codes.
3. Register the tool in `server.py` with a description for each argument.
4. Ask *"How many rupees is one US dollar?"* with **Run MCP**.
5. Write tests for a valid pair, a lower-case pair and an unknown currency.
6. Bonus: add a preset prompt in `frontend/src/lib/presets.ts`.

<details>
<summary><strong>Hints</strong></summary>

- Store every rate against one base currency (USD). Then any pair is `rate[from] / rate[to]`.
- Return errors as data (`{"error": ...}`) so the model can explain the problem to the user.
- Use `Annotated[str, Field(description=...)]` so each argument is described in the schema.

</details>

<details>
<summary><strong>Solution</strong></summary>

```python
# mcp-server/tools.py
# Demo rates: value of 1 unit in US dollars. Not live rates.
RATES_IN_USD = {"USD": 1.0, "INR": 0.012, "EUR": 1.08, "GBP": 1.27, "SGD": 0.74, "JPY": 0.0067}


def get_exchange_rate(from_currency: str, to_currency: str) -> dict[str, Any]:
    """Convert between two currencies using fixed demo rates."""
    source, target = from_currency.strip().upper(), to_currency.strip().upper()
    unknown = [code for code in (source, target) if code not in RATES_IN_USD]
    if unknown:
        return {"error": f"Unsupported currency: {', '.join(unknown)}", "supported": sorted(RATES_IN_USD)}
    return {
        "from": source,
        "to": target,
        "rate": round(RATES_IN_USD[source] / RATES_IN_USD[target], 4),
        "source": "Demo data — not live rates",
    }
```

```python
# mcp-server/server.py
@mcp.tool()
def get_exchange_rate(
    from_currency: Annotated[str, Field(description="ISO currency code to convert from, e.g. USD")],
    to_currency: Annotated[str, Field(description="ISO currency code to convert to, e.g. INR")],
) -> dict[str, Any]:
    """Get the exchange rate between two currencies (demo data, not live rates)."""
    return tools.get_exchange_rate(from_currency, to_currency)
```

</details>

---

## Build Something

Add your own MCP tool and contribute it back. Pick a tool that works **without secrets or paid API keys**.

```text
Fork the repository
        ↓
Create a feature branch
        ↓
Add your own MCP tool
        ↓
Update documentation
        ↓
Test it
        ↓
Commit changes
        ↓
Push branch
        ↓
Open a Pull Request
```

### Ideas

| Tool | Idea |
| --- | --- |
| `get_time()` | Local time in a city |
| `get_exchange_rate()` | Currency conversion with demo rates |
| `convert_units()` | km ↔ miles, °C ↔ °F, kg ↔ lb |
| `get_random_quote()` | A quote from a local list |
| `search_documentation()` | Search the `docs/` folder of this repo |
| `get_github_repo_info()` | Public GitHub API, no token needed |
| `search_local_events()` | Search a small JSON file of events |
| `calculate()` | Extend it: sqrt, round, percentages |

See [contributing.md](contributing.md) for the full pull request workflow.
