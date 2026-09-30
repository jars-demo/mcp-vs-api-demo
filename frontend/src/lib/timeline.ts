// Turns the events streamed by the backend into timeline rows.
//
// Before a run starts, every mode shows its *expected* path in grey
// ("pending"). As real events arrive, rows light up. Steps that never
// happen (e.g. no tool was needed) are shown as "skipped" at the end.

import type { JsonObject, Mode, StepEvent } from "../types/events";

export type StepStatus = "pending" | "running" | "success" | "error" | "skipped";
export type RunPhase = "idle" | "running" | "done" | "error";

export interface TimelineStep {
  id: string;
  stage: string;
  title: string;
  description: string;
  status: StepStatus;
  node: string | null;
  details: JsonObject | null;
  timestamp: string | null;
  elapsedMs: number | null;
}

interface TemplateStep {
  id: string;
  stage: string;
  title: string;
  description: string;
}

/** The expected path for each mode. `id` matches the backend's step_id. */
export const TEMPLATES: Record<Mode, TemplateStep[]> = {
  api: [
    { id: "user", stage: "user", title: "Prompt received", description: "The user sends a message." },
    { id: "backend", stage: "backend", title: "POST /api/api-mode/chat", description: "FastAPI receives the request." },
    { id: "model", stage: "model", title: "Groq", description: "The model decides whether a tool is needed." },
    { id: "tool", stage: "tool", title: "get_weather()", description: "The backend calls its own function." },
    { id: "data", stage: "data", title: "Tool result", description: "Mock data is returned." },
    { id: "model_final", stage: "model", title: "Final response", description: "Groq writes the answer." },
    { id: "response", stage: "response", title: "Response", description: "The answer is sent to the browser." },
  ],
  mcp: [
    { id: "user", stage: "user", title: "Prompt received", description: "The user sends a message." },
    { id: "client", stage: "client", title: "MCP client initialized", description: "Connect to the MCP server." },
    { id: "tools_list", stage: "mcp", title: "tools/list", description: "Ask the server which tools exist." },
    { id: "discovery", stage: "discovery", title: "Tools discovered", description: "Tools are learned at runtime." },
    { id: "model", stage: "model", title: "Groq", description: "The model decides whether a tool is needed." },
    { id: "tools_call", stage: "mcp", title: "tools/call", description: "Ask the server to run the tool." },
    { id: "server", stage: "server", title: "get_weather()", description: "The MCP server runs the tool." },
    { id: "result", stage: "result", title: "Tool result", description: "The result comes back over MCP." },
    { id: "model_final", stage: "model", title: "Final response", description: "Groq writes the answer." },
    { id: "response", stage: "response", title: "Response", description: "The answer is sent to the browser." },
  ],
};

/** "tool#2" -> "tool" */
export function baseId(stepId: string): string {
  return stepId.split("#")[0];
}

function fromEvent(event: StepEvent): TimelineStep {
  return {
    id: event.step_id,
    stage: event.stage,
    title: event.title,
    description: event.description,
    status: event.status,
    node: event.node,
    details: event.details,
    timestamp: event.timestamp,
    elapsedMs: event.elapsed_ms,
  };
}

function placeholder(step: TemplateStep, phase: RunPhase): TimelineStep {
  const finished = phase === "done" || phase === "error";
  return {
    ...step,
    status: finished ? "skipped" : "pending",
    node: null,
    details: null,
    timestamp: null,
    elapsedMs: null,
  };
}

/**
 * Merge real events with the expected template.
 *
 * `events` must be the *latest* event per step_id, in arrival order.
 * Real steps keep their arrival order; each unseen template step is placed
 * just before the first real step that comes after it in the template.
 */
export function buildTimeline(mode: Mode, events: StepEvent[], phase: RunPhase): TimelineStep[] {
  const template = TEMPLATES[mode];
  const order = new Map(template.map((step, index) => [step.id, index]));
  const seen = new Set(events.map((event) => baseId(event.step_id)));

  const rows = events.map(fromEvent);
  for (const step of template) {
    if (seen.has(step.id)) continue;
    const position = order.get(step.id) ?? 0;
    const insertAt = rows.findIndex((row) => (order.get(baseId(row.id)) ?? 0) > position);
    const row = placeholder(step, phase);
    if (insertAt === -1) rows.push(row);
    else rows.splice(insertAt, 0, row);
  }
  return rows;
}
