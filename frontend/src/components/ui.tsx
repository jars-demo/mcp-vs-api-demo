// Small presentational building blocks used across pages.

import type { ReactNode } from "react";
import type { Mode } from "../types/events";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-muted uppercase">{children}</p>;
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="max-w-2xl">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {children && <div className="mt-2 text-[15px] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-line bg-surface ${className}`}>{children}</div>;
}

/** Static class names per mode, so Tailwind can see them. */
export const MODE_STYLES: Record<Mode, { label: string; text: string; bg: string; soft: string; border: string; softBorder: string; dot: string }> = {
  api: {
    label: "API",
    text: "text-api",
    bg: "bg-api",
    soft: "bg-api-soft",
    border: "border-api",
    softBorder: "border-api/25",
    dot: "bg-api",
  },
  mcp: {
    label: "MCP",
    text: "text-mcp",
    bg: "bg-mcp",
    soft: "bg-mcp-soft",
    border: "border-mcp",
    softBorder: "border-mcp/25",
    dot: "bg-mcp",
  },
};

export function ModeTag({ mode }: { mode: Mode }) {
  const style = MODE_STYLES[mode];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${style.soft} ${style.text}`}>
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}

export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded border border-line bg-wash px-1 py-px font-mono text-[0.85em]">{children}</code>;
}

export function Callout({ title, children, tone = "neutral" }: { title: string; children: ReactNode; tone?: "neutral" | "strong" }) {
  const strong = tone === "strong";
  return (
    <div className={`rounded-lg border px-4 py-3.5 ${strong ? "border-ink bg-ink text-canvas" : "border-line bg-wash"}`}>
      <p className={`text-[13px] font-semibold ${strong ? "text-canvas" : "text-ink"}`}>{title}</p>
      <div className={`mt-1 text-[14px] leading-relaxed ${strong ? "text-canvas/80" : "text-muted"}`}>{children}</div>
    </div>
  );
}
