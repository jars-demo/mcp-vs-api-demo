// React state for one mode's run (API or MCP).
// Each mode has its own independent run, so "Run Both" shows two timelines
// progressing at their own pace.

import { useCallback, useReducer, useRef } from "react";
import type { ErrorEvent, ExecutionEvent, Mode, StepEvent } from "../types/events";
import { BackendUnavailableError, streamChat } from "./api";
import type { RunPhase } from "./timeline";

export interface RunError {
  code: string;
  message: string;
  hint: string;
  technical: string | null;
}

export interface RunState {
  phase: RunPhase;
  message: string | null;
  /** Latest event per step_id, in the order steps first appeared. */
  steps: StepEvent[];
  /** Every event received, for the presenter-mode event log. */
  log: { receivedAt: number; event: ExecutionEvent }[];
  answer: string | null;
  error: RunError | null;
  elapsedMs: number | null;
}

type Action =
  | { type: "start"; message: string }
  | { type: "event"; event: ExecutionEvent; receivedAt: number }
  | { type: "failed"; error: RunError };

const initialState: RunState = {
  phase: "idle",
  message: null,
  steps: [],
  log: [],
  answer: null,
  error: null,
  elapsedMs: null,
};

function upsertStep(steps: StepEvent[], event: StepEvent): StepEvent[] {
  const index = steps.findIndex((step) => step.step_id === event.step_id);
  if (index === -1) return [...steps, event];
  const next = steps.slice();
  next[index] = event;
  return next;
}

function toRunError(event: ErrorEvent): RunError {
  return { code: event.code, message: event.message, hint: event.hint, technical: event.technical };
}

function reducer(state: RunState, action: Action): RunState {
  switch (action.type) {
    case "start":
      return { ...initialState, phase: "running", message: action.message };
    case "failed":
      return { ...state, phase: "error", error: action.error };
    case "event": {
      const { event } = action;
      const log = [...state.log, { receivedAt: action.receivedAt, event }];
      if (event.type === "step") return { ...state, log, steps: upsertStep(state.steps, event) };
      if (event.type === "error")
        return { ...state, log, phase: "error", error: toRunError(event), elapsedMs: event.elapsed_ms ?? null };
      return { ...state, log, phase: "done", answer: event.answer, elapsedMs: event.elapsed_ms };
    }
  }
}

const BACKEND_DOWN: RunError = {
  code: "backend_unavailable",
  message: "Backend unavailable.",
  hint: "Start the FastAPI server and try again.",
  technical: null,
};

export function useRun(mode: Mode) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const controller = useRef<AbortController | null>(null);

  const run = useCallback(
    async (message: string) => {
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      dispatch({ type: "start", message });

      let finished = false;
      try {
        await streamChat(
          mode,
          message,
          (event) => {
            if (event.type !== "step") finished = true;
            dispatch({ type: "event", event, receivedAt: Date.now() });
          },
          abort.signal,
        );
        if (!finished) {
          dispatch({ type: "failed", error: { ...BACKEND_DOWN, message: "The backend closed the stream early." } });
        }
      } catch (error) {
        if (abort.signal.aborted) return;
        const technical = error instanceof Error ? error.message : String(error);
        if (error instanceof BackendUnavailableError) {
          dispatch({ type: "failed", error: { ...BACKEND_DOWN, technical } });
        } else {
          dispatch({
            type: "failed",
            error: { code: "request_failed", message: technical, hint: "Check the prompt and try again.", technical },
          });
        }
      }
    },
    [mode],
  );

  return { state, run };
}
