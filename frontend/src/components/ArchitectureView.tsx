// Two simplified request paths. The node that is working right now is highlighted.

import { ArrowRight } from "lucide-react";
import { Fragment } from "react";
import type { Mode } from "../types/events";
import { MODE_STYLES, ModeTag } from "./ui";

interface FlowNode {
  id: string;
  label: string;
  detail: string;
}

export const ARCHITECTURE: Record<Mode, FlowNode[]> = {
  api: [
    { id: "user", label: "User", detail: "Browser" },
    { id: "react", label: "React", detail: "Vite + TS" },
    { id: "fastapi", label: "FastAPI", detail: "backend/app.py" },
    { id: "groq", label: "Groq", detail: "tool calling" },
    { id: "app_tool", label: "Application Tool", detail: "api_mode/tools.py" },
    { id: "data", label: "Data", detail: "mock weather" },
  ],
  mcp: [
    { id: "user", label: "User", detail: "Browser" },
    { id: "react", label: "React", detail: "Vite + TS" },
    { id: "fastapi", label: "FastAPI", detail: "backend/app.py" },
    { id: "groq", label: "Groq", detail: "tool calling" },
    { id: "mcp_client", label: "MCP Client", detail: "mcp_mode/client.py" },
    { id: "mcp_server", label: "MCP Server", detail: "mcp-server/server.py" },
    { id: "tool", label: "Tool", detail: "mcp-server/tools.py" },
    { id: "data", label: "Data", detail: "mock weather" },
  ],
};

interface FlowProps {
  mode: Mode;
  active?: string | null;
  visited?: Set<string>;
  showDetails?: boolean;
}

export function ArchitectureFlow({ mode, active = null, visited, showDetails = false }: FlowProps) {
  const style = MODE_STYLES[mode];
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2">
        <ModeTag mode={mode} />
        <span className="text-[13px] text-muted">
          {mode === "api" ? "Application-controlled" : "Protocol-based discovery"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-y-2">
        {ARCHITECTURE[mode].map((node, index) => {
          const isActive = node.id === active;
          const wasVisited = visited?.has(node.id) ?? false;
          const box = isActive
            ? `${style.border} ${style.soft} ${style.text} animate-pulse-ring`
            : wasVisited
              ? "border-line-strong bg-surface text-ink"
              : "border-line bg-surface text-muted";
          return (
            <Fragment key={node.id}>
              {index > 0 && <ArrowRight className="mx-1 size-3.5 shrink-0 text-subtle" />}
              <div className={`rounded-md border px-2.5 py-1.5 transition ${box}`}>
                <p className="text-[12.5px] font-medium whitespace-nowrap">{node.label}</p>
                {showDetails && <p className="font-mono text-[10px] whitespace-nowrap text-subtle">{node.detail}</p>}
              </div>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
