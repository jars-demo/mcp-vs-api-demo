// Presenter mode: every raw event exactly as the backend streamed it.

import type { RunState } from "../lib/useRun";
import type { ExecutionEvent, Mode } from "../types/events";
import { CodeBlock } from "./CodeBlock";
import { Card, ModeTag } from "./ui";

function summary(event: ExecutionEvent): string {
  if (event.type === "step") return `${event.step_id} · ${event.status} · ${event.title}`;
  if (event.type === "error") return event.code;
  return "done";
}

export function EventLog({ runs }: { runs: Record<Mode, RunState> }) {
  const entries = (Object.keys(runs) as Mode[])
    .flatMap((mode) => runs[mode].log.map((entry, index) => ({ mode, index, ...entry })))
    .sort((a, b) => a.receivedAt - b.receivedAt);

  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h3 className="text-[15px] font-semibold">Backend events</h3>
        <span className="font-mono text-[11px] text-muted">{entries.length} events · Server-Sent Events</span>
      </div>
      {entries.length === 0 ? (
        <p className="px-4 py-6 text-[13px] text-muted">Run a prompt to see the raw events streamed by FastAPI.</p>
      ) : (
        <ol className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {entries.map(({ mode, index, event }) => (
            <li key={`${mode}-${index}`}>
              <details>
                <summary className="flex items-center gap-3 px-4 py-2 text-[13px] hover:bg-wash">
                  <ModeTag mode={mode} />
                  <span className="w-10 font-mono text-[12px] text-muted">{event.type}</span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[12px]">{summary(event)}</span>
                  <span className="font-mono text-[11px] text-subtle">{event.elapsed_ms ?? ""} ms</span>
                </summary>
                <div className="px-4 pb-3">
                  <CodeBlock code={event} />
                </div>
              </details>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
