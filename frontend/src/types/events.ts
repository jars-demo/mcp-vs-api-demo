// Types for everything the backend sends to the browser.
// They mirror backend/shared/events.py and backend/app.py.

export type Mode = "api" | "mcp";

export type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

/** One timeline step, sent while it is running and again when it finishes. */
export interface StepEvent {
  type: "step";
  mode: Mode;
  step_id: string;
  stage: string;
  title: string;
  description: string;
  status: "running" | "success" | "error";
  node: string | null;
  details: JsonObject | null;
  timestamp: string;
  elapsed_ms: number;
}

export interface ErrorEvent {
  type: "error";
  mode: Mode;
  code: string;
  message: string;
  hint: string;
  technical: string | null;
  elapsed_ms?: number;
}

export interface DoneEvent {
  type: "done";
  mode: Mode;
  answer: string;
  elapsed_ms: number;
}

export type ExecutionEvent = StepEvent | ErrorEvent | DoneEvent;

// ─── /api/status ────────────────────────────────────────────

export interface McpToolSchema {
  name: string;
  description: string;
  inputSchema: JsonObject;
}

export interface ApiToolDefinition {
  type: "function";
  function: { name: string; description: string; parameters: JsonObject };
}

export interface StatusResponse {
  backend: "ok";
  groq: { configured: boolean; model: string };
  mcp: {
    connected: boolean;
    url: string;
    server: { name: string; version?: string } | null;
    tools: McpToolSchema[];
  };
  mcp_transport?: string;
  api_tools: ApiToolDefinition[];
}
