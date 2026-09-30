// Backend / MCP / Groq status for the header indicators and tool panel.
// Polls gently (every 30 s, only while the tab is visible) plus on demand.

import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusResponse } from "../types/events";
import { fetchStatus } from "./api";

const POLL_INTERVAL_MS = 30_000;

export interface StatusState {
  loading: boolean;
  backendOnline: boolean;
  status: StatusResponse | null;
}

export function useStatus() {
  const [state, setState] = useState<StatusState>({ loading: true, backendOnline: false, status: null });
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setState((previous) => ({ ...previous, loading: true }));
    try {
      const status = await fetchStatus(controller.signal);
      setState({ loading: false, backendOnline: true, status });
    } catch {
      if (!controller.signal.aborted) setState({ loading: false, backendOnline: false, status: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
      inFlight.current?.abort();
    };
  }, [refresh]);

  return { ...state, refresh };
}
