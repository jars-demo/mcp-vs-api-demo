// One side of the simulator: header, timeline, response and explanation.

import { AlertTriangle, Info } from "lucide-react";
import { buildTimeline } from "../lib/timeline";
import type { RunState } from "../lib/useRun";
import type { Mode } from "../types/events";
import { CodeBlock } from "./CodeBlock";
import { Timeline } from "./Timeline";
import { Card, MODE_STYLES, ModeTag } from "./ui";

const MODE_COPY: Record<Mode, { title: string; subtitle: string; happened: string; detail: string }> = {
  api: {
    title: "Traditional Integration",
    subtitle: "The application defines and calls its tools.",
    happened: "The application knows how to invoke the capability.",
    detail:
      "The tool definitions are hard-coded in backend/api_mode/tools.py. When Groq asked for get_weather, the backend called its own Python function directly.",
  },
  mcp: {
    title: "Model Context Protocol",
    subtitle: "Tools are discovered from an MCP server.",
    happened: "The MCP client discovered a standardized tool exposed by the MCP server.",
    detail:
      "The backend asked the server what it offers (tools/list), handed those tools to Groq, then ran the chosen one through the protocol (tools/call).",
  },
};

const PHASE_BADGE = {
  idle: { label: "Ready", className: "text-muted" },
  running: { label: "Running", className: "text-ink" },
  done: { label: "Complete", className: "text-ok" },
  error: { label: "Error", className: "text-bad" },
} as const;

interface ModePanelProps {
  mode: Mode;
  state: RunState;
  presenter: boolean;
}

export function ModePanel({ mode, state, presenter }: ModePanelProps) {
  const copy = MODE_COPY[mode];
  const steps = buildTimeline(mode, state.steps, state.phase);
  const badge = PHASE_BADGE[state.phase];
  const usedWeather = state.steps.some((step) => step.title.startsWith("get_weather("));

  return (
    <Card className="flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
        <div>
          <ModeTag mode={mode} />
          <h3 className="mt-1.5 text-[17px] font-semibold tracking-tight">{copy.title}</h3>
          <p className="text-[13px] text-muted">{copy.subtitle}</p>
        </div>
        <div className="text-right">
          <p className={`text-[12px] font-medium ${badge.className}`}>{badge.label}</p>
          {state.elapsedMs !== null && <p className="font-mono text-[11px] text-subtle">{state.elapsedMs} ms</p>}
        </div>
      </div>

      {/* Request payload (presenter mode) */}
      {presenter && state.message && (
        <div className="border-b border-line px-4 pt-3 pb-3.5 sm:px-5">
          <p className="mb-1.5 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Request</p>
          <CodeBlock
            language="http"
            code={`POST /api/${mode}-mode/chat\nContent-Type: application/json\n\n${JSON.stringify({ message: state.message }, null, 2)}`}
          />
        </div>
      )}

      {/* Timeline */}
      <div className="px-2 pt-3 sm:px-3">
        <Timeline mode={mode} steps={steps} presenter={presenter} />
      </div>

      <div className="mt-auto space-y-3 px-4 pb-4 sm:px-5 sm:pb-5">
        {state.error && <ErrorBox error={state.error} presenter={presenter} />}

        {state.answer !== null && (
          <div className={`rounded-lg border ${MODE_STYLES[mode].softBorder} ${MODE_STYLES[mode].soft} px-4 py-3`}>
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Response</p>
              {usedWeather && <p className="font-mono text-[10.5px] text-warn">Demo data — not live weather</p>}
            </div>
            <p className="mt-1 text-[15px] leading-relaxed">{state.answer || "(empty response)"}</p>
          </div>
        )}

        {state.phase === "done" && (
          <div className="rounded-lg border border-line bg-wash px-4 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold">
              <Info className="size-3.5" /> What just happened?
            </p>
            <p className="mt-1 text-[14px] font-medium">{copy.happened}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{copy.detail}</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function ErrorBox({ error, presenter }: { error: NonNullable<RunState["error"]>; presenter: boolean }) {
  return (
    <div role="alert" className="rounded-lg border border-bad/25 bg-bad-soft px-4 py-3">
      <p className="flex items-center gap-1.5 text-[14px] font-semibold text-bad">
        <AlertTriangle className="size-4" /> {error.message}
      </p>
      <p className="mt-0.5 text-[13px] text-ink/80">{error.hint}</p>
      {presenter && error.technical && (
        <p className="mt-2 font-mono text-[11.5px] break-words text-muted">
          [{error.code}] {error.technical}
        </p>
      )}
    </div>
  );
}
