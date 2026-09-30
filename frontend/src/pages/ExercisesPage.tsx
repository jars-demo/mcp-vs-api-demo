// Hands-on exercises. Solutions are hidden until you open them.
// The same content lives in docs/exercises.md for reading on GitHub.

import { ChevronRight, GitPullRequest, Lightbulb } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";
import { Callout, Card, Container, Eyebrow, InlineCode } from "../components/ui";

function Reveal({ label, icon, children }: { label: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <details className="group rounded-md border border-line bg-surface">
      <summary className="flex items-center gap-2 px-4 py-3 text-[14px] font-medium">
        <ChevronRight className="size-4 text-subtle transition group-open:rotate-90" />
        {icon}
        {label}
      </summary>
      <div className="space-y-3 border-t border-line px-4 py-4 text-[14px] leading-relaxed">{children}</div>
    </details>
  );
}

function Tasks({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-2 text-[15px]">
      {items.map((item, index) => (
        <li key={index} className="flex gap-3">
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-line font-mono text-[11px] text-muted">
            {index + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

const GET_TIME_TOOL = `# mcp-server/tools.py
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
    return {"city": city, "error": "Unknown city"}`;

const GET_TIME_REGISTER = `# mcp-server/server.py  (next to get_weather and calculate)
@mcp.tool()
def get_time(
    city: Annotated[str, Field(description="City name, for example Mumbai or London")],
) -> dict[str, Any]:
    """Get the current local time in a city."""
    return tools.get_time(city)`;

const GET_TIME_TEST = `# mcp-server/tests/test_server.py
def test_get_time_is_discoverable() -> None:
    assert "get_time" in asyncio.run(_list_tools())


def test_get_time_invocation() -> None:
    result = asyncio.run(_call_tool("get_time", {"city": "London"}))
    assert result["city"] == "London"
    assert ":" in result["local_time"]`;

const EXCHANGE_TOOL = `# mcp-server/tools.py
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
    }`;

const EXCHANGE_REGISTER = `# mcp-server/server.py
@mcp.tool()
def get_exchange_rate(
    from_currency: Annotated[str, Field(description="ISO currency code to convert from, e.g. USD")],
    to_currency: Annotated[str, Field(description="ISO currency code to convert to, e.g. INR")],
) -> dict[str, Any]:
    """Get the exchange rate between two currencies (demo data, not live rates)."""
    return tools.get_exchange_rate(from_currency, to_currency)`;

const IDEAS = [
  ["get_time()", "Local time in a city"],
  ["get_exchange_rate()", "Currency conversion with demo rates"],
  ["convert_units()", "km ↔ miles, °C ↔ °F, kg ↔ lb"],
  ["get_random_quote()", "A quote from a local list"],
  ["search_documentation()", "Search the docs/ folder of this repo"],
  ["get_github_repo_info()", "Public GitHub API, no token needed"],
  ["search_local_events()", "Search a small JSON file of events"],
  ["calculate()", "Extend it: sqrt, round, percentages"],
];

export function ExercisesPage() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  return (
    <Container className="pt-10 sm:pt-14">
      <div className="max-w-3xl">
        <Eyebrow>Hands-on</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">Exercises</h1>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">
          Add real tools to the MCP server. Try each task first, use the hints if you get stuck, and open the solution
          only to check your work.
        </p>

        {/* Exercise 1 */}
        <section className="mt-12">
          <p className="font-mono text-[12px] text-subtle">Exercise 1 · ~15 min</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Add <span className="font-mono">get_time(city)</span>
          </h2>
          <p className="mt-2 text-[15px] text-muted">Return the current local time for a city. No API key needed.</p>
          <div className="mt-5">
            <Tasks
              items={[
                <>
                  Create the tool: write a <InlineCode>get_time(city)</InlineCode> function in{" "}
                  <InlineCode>mcp-server/tools.py</InlineCode>.
                </>,
                <>Define the schema: type hints plus a docstring (MCP generates the JSON Schema).</>,
                <>
                  Register it with <InlineCode>@mcp.tool()</InlineCode> in <InlineCode>mcp-server/server.py</InlineCode>.
                </>,
                <>
                  Make it discoverable: restart the MCP server and check the <strong>Available MCP Tools</strong> panel.
                </>,
                <>
                  Invoke it through MCP: ask <InlineCode>What time is it in London?</InlineCode> and click{" "}
                  <strong>Run MCP</strong>.
                </>,
                <>Test it: add a test and run <InlineCode>python -m pytest</InlineCode> in mcp-server/.</>,
              ]}
            />
          </div>
          <div className="mt-5 space-y-2">
            <Reveal label="Hints" icon={<Lightbulb className="size-4 text-warn" />}>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  Copy the shape of <InlineCode>get_weather</InlineCode>: a plain function in tools.py, a thin decorated
                  wrapper in server.py.
                </li>
                <li>
                  Use <InlineCode>datetime.now(timezone.utc) + timedelta(hours=offset)</InlineCode> with a small dict of
                  UTC offsets.
                </li>
                <li>
                  The docstring becomes the tool description. The model reads it to decide when to call your tool, so
                  make it clear.
                </li>
                <li>
                  You do <strong>not</strong> need to change the backend. MCP mode discovers the new tool through{" "}
                  <InlineCode>tools/list</InlineCode>.
                </li>
              </ul>
            </Reveal>
            <Reveal label="Solution">
              <CodeBlock language="python" code={GET_TIME_TOOL} />
              <CodeBlock language="python" code={GET_TIME_REGISTER} />
              <CodeBlock language="python" code={GET_TIME_TEST} />
            </Reveal>
          </div>
          <div className="mt-5">
            <Callout title="Notice what you did not touch">
              API mode will not see <InlineCode>get_time</InlineCode> until someone edits{" "}
              <InlineCode>backend/api_mode/tools.py</InlineCode>. MCP mode picked it up from the server. Try adding it to
              API mode too and compare the two changes.
            </Callout>
          </div>
        </section>

        {/* Exercise 2 */}
        <section className="mt-16">
          <p className="font-mono text-[12px] text-subtle">Exercise 2 · ~20 min</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">
            Add <span className="font-mono">get_exchange_rate(from_currency, to_currency)</span>
          </h2>
          <p className="mt-2 text-[15px] text-muted">
            A more realistic tool: two arguments, input normalization and a helpful error for unsupported currencies. Use
            fixed demo rates, so no API key is needed.
          </p>
          <div className="mt-5">
            <Tasks
              items={[
                <>
                  Add a <InlineCode>RATES_IN_USD</InlineCode> dict and a <InlineCode>get_exchange_rate()</InlineCode>{" "}
                  function to tools.py.
                </>,
                <>Accept lower-case codes like “usd” and return an error listing the supported codes.</>,
                <>Register the tool in server.py with a description for each argument.</>,
                <>
                  Ask <InlineCode>How many rupees is one US dollar?</InlineCode> with <strong>Run MCP</strong>.
                </>,
                <>Write tests for a valid pair, a lower-case pair and an unknown currency.</>,
                <>
                  Bonus: add a preset prompt in <InlineCode>frontend/src/lib/presets.ts</InlineCode>.
                </>,
              ]}
            />
          </div>
          <div className="mt-5 space-y-2">
            <Reveal label="Hints" icon={<Lightbulb className="size-4 text-warn" />}>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>Store every rate against one base currency (USD). Then any pair is rate[from] / rate[to].</li>
                <li>
                  Return errors as data (<InlineCode>{'{"error": ...}'}</InlineCode>) so the model can explain the
                  problem to the user.
                </li>
                <li>
                  Use <InlineCode>Annotated[str, Field(description=...)]</InlineCode> so each argument is described in
                  the schema.
                </li>
              </ul>
            </Reveal>
            <Reveal label="Solution">
              <CodeBlock language="python" code={EXCHANGE_TOOL} />
              <CodeBlock language="python" code={EXCHANGE_REGISTER} />
            </Reveal>
          </div>
        </section>

        {/* Build something */}
        <section id="build-something" className="mt-16 scroll-mt-20">
          <p className="font-mono text-[12px] text-subtle">Open-source challenge</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight">Build Something</h2>
          <p className="mt-2 text-[15px] text-muted">
            Add your own MCP tool and contribute it back. Pick a tool that works without secrets or paid API keys.
          </p>
          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <CodeBlock
              language="text"
              code={[
                "Fork the repository",
                "Create a feature branch",
                "Add your own MCP tool",
                "Update documentation",
                "Test it",
                "Commit changes",
                "Push branch",
                "Open a Pull Request",
              ].join("\n   ↓\n")}
            />
            <CodeBlock
              language="bash"
              code={`git clone <your-fork-url>
cd mcp-vs-api-workshop
git checkout -b feat/my-mcp-tool
python setup.py

# ...add your tool + tests + docs...

cd mcp-server && python -m pytest
git add .
git commit -m "feat: add unit converter MCP tool"
git push origin feat/my-mcp-tool`}
            />
          </div>

          <h3 className="mt-8 text-[15px] font-semibold">Ideas</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {IDEAS.map(([name, description]) => (
              <Card key={name} className="px-3.5 py-2.5">
                <p className="font-mono text-[13px] font-semibold">{name}</p>
                <p className="text-[13px] text-muted">{description}</p>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <Callout title="Before you open the pull request">
              <span className="flex items-start gap-2">
                <GitPullRequest className="mt-1 size-4 shrink-0" />
                <span>
                  Tests pass, docs are updated, and no secrets are committed (<InlineCode>.env</InlineCode> is
                  git-ignored). Explain what you added, why, and how to test it. See{" "}
                  <InlineCode>docs/contributing.md</InlineCode>.
                </span>
              </span>
            </Callout>
          </div>
        </section>
      </div>
    </Container>
  );
}
