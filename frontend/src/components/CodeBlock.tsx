// Monospace code block with lightweight JSON highlighting.

import { Check, Copy } from "lucide-react";
import { useState, type ReactNode } from "react";

const JSON_TOKEN = /("(?:\.|[^"\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

function highlightJson(source: string): ReactNode[] {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of source.matchAll(JSON_TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(source.slice(last, index));
    const [token, text, colon, literal, number] = match;
    if (text && colon) parts.push(<span key={index} className="text-[#7c3aed]">{text}</span>, colon);
    else if (text) parts.push(<span key={index} className="text-[#15803d]">{text}</span>);
    else if (literal) parts.push(<span key={index} className="text-[#b45309]">{literal}</span>);
    else if (number) parts.push(<span key={index} className="text-[#2563eb]">{number}</span>);
    else parts.push(token);
    last = index + token.length;
  }
  parts.push(source.slice(last));
  return parts;
}

interface CodeBlockProps {
  code: string | unknown;
  language?: "json" | "python" | "bash" | "text" | "http";
  title?: string;
  className?: string;
}

export function CodeBlock({ code, language = "json", title, className = "" }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const text = typeof code === "string" ? code : JSON.stringify(code, null, 2);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); ignore.
    }
  };

  return (
    <div className={`group relative overflow-hidden rounded-md border border-line bg-[#fbfbfa] ${className}`}>
      {title && (
        <div className="border-b border-line px-3 py-1.5 font-mono text-[11px] text-muted">{title}</div>
      )}
      <button
        type="button"
        onClick={copy}
        aria-label="Copy code"
        className="absolute top-1.5 right-1.5 rounded border border-line bg-surface p-1 text-muted opacity-0 transition group-hover:opacity-100 hover:text-ink focus:opacity-100"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      </button>
      <pre className="max-h-[26rem] overflow-auto p-3 font-mono text-[12.5px] leading-relaxed text-ink">
        <code>{language === "json" ? highlightJson(text) : text}</code>
      </pre>
    </div>
  );
}
