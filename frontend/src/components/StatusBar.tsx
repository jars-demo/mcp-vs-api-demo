import { RefreshCw } from "lucide-react";
import type { StatusState } from "../lib/useStatus";

type Tone = "ok" | "bad" | "warn" | "unknown";

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  bad: "bg-bad",
  warn: "bg-warn",
  unknown: "bg-line-strong",
};

function Indicator({ label, value, tone }: { label: string; value: string; tone: Tone }) {
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1.5 font-medium">
        <span className={`size-2 rounded-full ${DOT[tone]}`} />
        {value}
      </span>
    </div>
  );
}

export function StatusBar({ status, onRefresh }: { status: StatusState; onRefresh: () => void }) {
  const first = status.loading && status.status === null && !status.backendOnline;
  const data = status.status;

  const backend: [string, Tone] = first ? ["Checking…", "unknown"] : status.backendOnline ? ["Connected", "ok"] : ["Offline", "bad"];
  const mcp: [string, Tone] = !data ? ["Unknown", "unknown"] : data.mcp.connected ? ["Connected", "ok"] : ["Offline", "bad"];
  const groq: [string, Tone] = !data ? ["Unknown", "unknown"] : data.groq.configured ? ["Configured", "ok"] : ["No API key", "warn"];

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <Indicator label="Backend" value={backend[0]} tone={backend[1]} />
      <Indicator label="MCP Server" value={mcp[0]} tone={mcp[1]} />
      <Indicator label="Groq" value={groq[0]} tone={groq[1]} />
      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh status"
        className="rounded p-1 text-subtle transition hover:bg-wash hover:text-ink"
      >
        <RefreshCw className={`size-3.5 ${status.loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}
