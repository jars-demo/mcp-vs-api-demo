// Presenter mode shows the technical details (payloads, schemas, timestamps,
// raw events). The choice is remembered in this browser only.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mcp-vs-api:presenter-mode";
const CHANGE_EVENT = "app:presenter-mode";

function read(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

export function usePresenterMode(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState(read);

  useEffect(() => {
    const sync = () => setEnabled(read());
    window.addEventListener(CHANGE_EVENT, sync);
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const update = useCallback((value: boolean) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? "on" : "off");
    } catch {
      // Storage can be blocked (private mode). The toggle still works for this page.
    }
    setEnabled(value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return [enabled, update];
}
