// All HTTP calls from the browser live here.
// The browser only ever talks to our FastAPI backend (via the Vite proxy),
// never to Groq directly — the API key stays on the server.

import type { ExecutionEvent, Mode, StatusResponse } from "../types/events";
import { createSseParser } from "./sse";

export const CHAT_ENDPOINTS: Record<Mode, string> = {
  api: "/api/api-mode/chat",
  mcp: "/api/mcp-mode/chat",
};

export class BackendUnavailableError extends Error {
  constructor(detail?: string) {
    super(detail ?? "Backend unavailable");
    this.name = "BackendUnavailableError";
  }
}

export async function fetchStatus(signal?: AbortSignal): Promise<StatusResponse> {
  let response: Response;
  try {
    response = await fetch("/api/status", { signal });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new BackendUnavailableError(String(error));
  }
  if (!response.ok) throw new BackendUnavailableError(`HTTP ${response.status}`);
  return (await response.json()) as StatusResponse;
}

/** POST a message and call `onEvent` for every event the backend streams back. */
export async function streamChat(
  mode: Mode,
  message: string,
  onEvent: (event: ExecutionEvent) => void,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(CHAT_ENDPOINTS[mode], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
      signal,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new BackendUnavailableError(String(error));
  }

  if (response.status === 422) throw new Error("The message must be between 1 and 500 characters.");
  if (!response.ok || !response.body) throw new BackendUnavailableError(`HTTP ${response.status}`);

  const parse = createSseParser((data) => onEvent(JSON.parse(data) as ExecutionEvent));
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parse(value);
  }
}
