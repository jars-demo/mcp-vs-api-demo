// The main screen: run the same prompt through API mode and MCP mode.

import { useEffect, useRef, useState } from "react";
import { ArchitectureFlow } from "../components/ArchitectureView";
import { ComparisonTable } from "../components/ComparisonTable";
import { EventLog } from "../components/EventLog";
import { ModePanel } from "../components/ModePanel";
import { PresenterToggle } from "../components/PresenterToggle";
import { PromptBar } from "../components/PromptBar";
import { StatusBar } from "../components/StatusBar";
import { ToolDiscoveryPanel } from "../components/ToolDiscoveryPanel";
import { Callout, Card, Container, Eyebrow, SectionHeading } from "../components/ui";
import { DEFAULT_PROMPT } from "../lib/presets";
import { usePresenterMode } from "../lib/usePresenterMode";
import { useRun, type RunState } from "../lib/useRun";
import { useStatus } from "../lib/useStatus";

type RunKind = "api" | "mcp" | "both";

/** The architecture node to highlight, and every node touched so far. */
function progress(state: RunState): { active: string | null; visited: Set<string> } {
  const visited = new Set<string>();
  if (state.phase !== "idle") visited.add("user").add("react").add("fastapi");
  for (const step of state.steps) if (step.node) visited.add(step.node);
  const running = [...state.steps].reverse().find((step) => step.status === "running");
  const latest = state.steps.at(-1);
  const active = state.phase === "running" ? (running?.node ?? latest?.node ?? null) : null;
  return { active, visited };
}

const isFinished = (state: RunState) => state.phase === "done" || state.phase === "error";

export function SimulatorPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [lastRun, setLastRun] = useState<RunKind | null>(null);
  const [presenter, setPresenter] = usePresenterMode();
  const status = useStatus();
  const api = useRun("api");
  const mcp = useRun("mcp");

  const busy = api.state.phase === "running" || mcp.state.phase === "running";
  const start = (kind: RunKind) => {
    const message = prompt.trim();
    if (!message) return;
    setLastRun(kind);
    if (kind !== "mcp") void api.run(message);
    if (kind !== "api") void mcp.run(message);
  };

  // Refresh the status indicators once a run finishes (not on a timer).
  const wasBusy = useRef(false);
  const { refresh } = status;
  useEffect(() => {
    if (wasBusy.current && !busy) void refresh();
    wasBusy.current = busy;
  }, [busy, refresh]);

  const apiProgress = progress(api.state);
  const mcpProgress = progress(mcp.state);
  const bothFinished = lastRun === "both" && isFinished(api.state) && isFinished(mcp.state);

  return (
    <Container className="pt-8 pb-4 sm:pt-10">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>Interactive Simulator</Eyebrow>
          <h1 className="mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl">
            MCP <span className="text-subtle">vs</span> API
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <StatusBar status={status} onRefresh={() => void status.refresh()} />
          <PresenterToggle enabled={presenter} onChange={setPresenter} />
        </div>
      </div>

      {/* Prompt */}
      <div className="mt-6">
        <PromptBar
          value={prompt}
          onChange={setPrompt}
          busy={busy}
          onRunApi={() => start("api")}
          onRunMcp={() => start("mcp")}
          onRunBoth={() => start("both")}
        />
      </div>

      {/* Side by side */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <ModePanel mode="api" state={api.state} presenter={presenter} />
        <ModePanel mode="mcp" state={mcp.state} presenter={presenter} />
      </div>

      {bothFinished && (
        <div className="mt-5 rounded-lg border border-line bg-surface px-5 py-4 text-center">
          <p className="text-lg font-semibold tracking-tight">Same user request.</p>
          <p className="text-lg tracking-tight text-muted">Different integration path.</p>
        </div>
      )}

      <div className="mt-5">
        <Callout title="Important: MCP does not replace APIs." tone="strong">
          An MCP tool can call an API internally. In a real system, <code className="font-mono">get_weather()</code> on
          the MCP server would usually call a weather REST API.
        </Callout>
      </div>

      {/* Architecture + tools */}
      <section className="mt-14 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-4 sm:p-5">
          <SectionHeading eyebrow="Architecture" title="Where the request goes">
            {presenter
              ? "Nodes light up as the backend reports each step. Labels show the file that handles each hop."
              : "Simplified path for each mode. The active step is highlighted during a run."}
          </SectionHeading>
          <div className="mt-5 space-y-6">
            <ArchitectureFlow mode="api" {...apiProgress} showDetails={presenter} />
            <ArchitectureFlow mode="mcp" {...mcpProgress} showDetails={presenter} />
          </div>
        </Card>
        <ToolDiscoveryPanel status={status} presenter={presenter} />
      </section>

      {/* Comparison */}
      <section className="mt-14">
        <SectionHeading eyebrow="Compare" title="Two integration patterns">
          Both paths use the same model, the same prompt and the same data. The difference is how the application finds
          and calls the capability.
        </SectionHeading>
        <div className="mt-5">
          <ComparisonTable />
        </div>
      </section>

      {presenter && (
        <section className="mt-14">
          <EventLog runs={{ api: api.state, mcp: mcp.state }} />
        </section>
      )}
    </Container>
  );
}
