// "Available MCP Tools": what the MCP server returned from tools/list.

import { ChevronRight, Wrench } from "lucide-react";
import type { StatusState } from "../lib/useStatus";
import { CodeBlock } from "./CodeBlock";
import { Card } from "./ui";

export function ToolDiscoveryPanel({ status, presenter }: { status: StatusState; presenter: boolean }) {
  const mcp = status.status?.mcp;
  const connected = mcp?.connected ?? false;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="text-[15px] font-semibold">Available MCP Tools</h3>
        <span className="flex items-center gap-1.5 text-[12px]">
          <span className="text-muted">MCP Server</span>
          <span className={`size-2 rounded-full ${connected ? "bg-ok" : "bg-bad"}`} />
          <span className="font-medium">{connected ? "Connected" : "Offline"}</span>
        </span>
      </div>

      <div className="flex-1 space-y-2 p-3">
        {!connected && (
          <p className="px-1 py-2 text-[13px] leading-relaxed text-muted">
            {status.backendOnline ? (
              <>
                MCP server unavailable. Start it with <code className="font-mono text-ink">python server.py</code> in
                the <code className="font-mono text-ink">mcp-server</code> folder.
              </>
            ) : (
              "Backend unavailable. Start the FastAPI server and try again."
            )}
          </p>
        )}
        {mcp?.tools.map((tool) => (
          <details key={`${tool.name}-${presenter}`} open={presenter} className="group rounded-md border border-line">
            <summary className="flex items-start gap-2 px-3 py-2.5">
              <Wrench className="mt-0.5 size-3.5 shrink-0 text-mcp" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13px] font-semibold">{tool.name}</p>
                <p className="text-[12.5px] leading-snug text-muted">{tool.description}</p>
              </div>
              <ChevronRight className="mt-0.5 size-3.5 shrink-0 text-subtle transition group-open:rotate-90" />
            </summary>
            <div className="px-3 pb-3">
              <p className="mb-1 font-mono text-[10.5px] tracking-[0.14em] text-muted uppercase">Input schema</p>
              <CodeBlock code={tool.inputSchema} />
            </div>
          </details>
        ))}
        {connected && mcp && (
          <p className="px-1 pt-1 font-mono text-[11px] text-subtle">
            {mcp.server?.name ?? "server"} · {mcp.url}
          </p>
        )}
      </div>
    </Card>
  );
}
