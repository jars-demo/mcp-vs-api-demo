// The step-by-step execution timeline for one mode.

import {
  ArrowLeftRight,
  Check,
  ChevronRight,
  Circle,
  Cpu,
  Database,
  FileJson,
  Loader2,
  MessageSquare,
  Minus,
  Plug,
  Search,
  Server,
  ServerCog,
  User,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import type { StepStatus, TimelineStep } from "../lib/timeline";
import type { Mode } from "../types/events";
import { CodeBlock } from "./CodeBlock";
import { MODE_STYLES } from "./ui";

const STAGE_ICONS: Record<string, LucideIcon> = {
  user: User,
  backend: Server,
  model: Cpu,
  tool: Wrench,
  data: Database,
  response: MessageSquare,
  client: Plug,
  mcp: ArrowLeftRight,
  discovery: Search,
  server: ServerCog,
  result: FileJson,
};

const STATUS_LABEL: Record<StepStatus, string> = {
  pending: "Pending",
  running: "Running",
  success: "Success",
  error: "Error",
  skipped: "Skipped",
};

const STATUS_PILL: Record<StepStatus, string> = {
  pending: "text-subtle",
  running: "text-ink",
  success: "text-ok",
  error: "text-bad",
  skipped: "text-subtle",
};

function StatusIcon({ status, mode }: { status: StepStatus; mode: Mode }) {
  const accent = MODE_STYLES[mode].text;
  switch (status) {
    case "running":
      return <Loader2 className={`size-3.5 animate-spin ${accent}`} />;
    case "success":
      return <Check className="size-3.5 text-ok" strokeWidth={2.5} />;
    case "error":
      return <X className="size-3.5 text-bad" strokeWidth={2.5} />;
    case "skipped":
      return <Minus className="size-3.5 text-subtle" />;
    default:
      return <Circle className="size-3 text-line-strong" />;
  }
}

interface TimelineProps {
  mode: Mode;
  steps: TimelineStep[];
  presenter: boolean;
}

export function Timeline({ mode, steps, presenter }: TimelineProps) {
  return (
    <ol className="relative">
      {steps.map((step, index) => (
        <TimelineRow key={step.id} mode={mode} step={step} presenter={presenter} last={index === steps.length - 1} />
      ))}
    </ol>
  );
}

interface RowProps {
  mode: Mode;
  step: TimelineStep;
  presenter: boolean;
  last: boolean;
}

function TimelineRow({ mode, step, presenter, last }: RowProps) {
  // null = not toggled by the user yet. Presenter mode auto-opens protocol and request payloads.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const Icon = STAGE_ICONS[step.stage] ?? Circle;
  const style = MODE_STYLES[mode];
  const inactive = step.status === "pending" || step.status === "skipped";
  const hasDetails = step.details !== null && Object.keys(step.details).length > 0;
  const isProtocolStep = step.stage === "mcp";
  const open = toggled ?? (presenter && (isProtocolStep || step.stage === "backend"));

  const iconBox =
    step.status === "running"
      ? `${style.border} ${style.soft} ${style.text} animate-pulse-ring`
      : step.status === "error"
        ? "border-bad bg-bad-soft text-bad"
        : inactive
          ? "border-line bg-canvas text-subtle"
          : "border-line-strong bg-surface text-ink";

  return (
    <li className="relative flex gap-3 pb-1">
      {/* connector line */}
      {!last && <span aria-hidden className="absolute top-9 bottom-0 left-[15px] w-px bg-line" />}

      <span className={`relative z-10 mt-1.5 flex size-[31px] shrink-0 items-center justify-center rounded-md border ${iconBox}`}>
        <Icon className="size-4" strokeWidth={1.75} />
      </span>

      <div className={`min-w-0 flex-1 pb-3 ${inactive ? "opacity-55" : ""}`}>
        <button
          type="button"
          disabled={!hasDetails}
          onClick={() => setToggled(!open)}
          aria-expanded={hasDetails ? open : undefined}
          className={`w-full rounded-md px-2 py-1.5 text-left transition ${hasDetails ? "hover:bg-wash" : "cursor-default"}`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10.5px] font-medium tracking-[0.14em] text-muted uppercase">{step.stage}</span>
            <span className={`flex items-center gap-1.5 text-[11px] font-medium ${STATUS_PILL[step.status]}`}>
              {presenter && step.elapsedMs !== null && (
                <span className="font-mono font-normal text-subtle">+{step.elapsedMs} ms</span>
              )}
              <StatusIcon status={step.status} mode={mode} />
              {STATUS_LABEL[step.status]}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            {hasDetails && (
              <ChevronRight className={`size-3.5 shrink-0 text-subtle transition ${open ? "rotate-90" : ""}`} />
            )}
            <span
              className={`min-w-0 truncate text-[14.5px] font-medium ${
                isProtocolStep ? `font-mono ${inactive ? "" : style.text}` : ""
              }`}
            >
              {step.title}
            </span>
          </div>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{step.description}</p>
          {presenter && step.timestamp && (
            <p className="mt-0.5 font-mono text-[10.5px] text-subtle">{new Date(step.timestamp).toLocaleTimeString()}</p>
          )}
        </button>
        {open && hasDetails && <CodeBlock code={step.details} className="mx-2 mt-1" />}
      </div>
    </li>
  );
}
