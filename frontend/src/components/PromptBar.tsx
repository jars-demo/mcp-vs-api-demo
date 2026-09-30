import { Play } from "lucide-react";
import type { FormEvent } from "react";
import { PRESET_PROMPTS } from "../lib/presets";
import { Card } from "./ui";

interface PromptBarProps {
  value: string;
  onChange: (value: string) => void;
  onRunApi: () => void;
  onRunMcp: () => void;
  onRunBoth: () => void;
  busy: boolean;
}

export function PromptBar({ value, onChange, onRunApi, onRunMcp, onRunBoth, busy }: PromptBarProps) {
  const empty = value.trim().length === 0;
  const disabled = empty || busy;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!disabled) onRunBoth(); // Enter = Run Both
  };

  return (
    <Card className="p-3 sm:p-4">
      <form onSubmit={submit} className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <label htmlFor="prompt" className="sr-only">
          Prompt
        </label>
        <input
          id="prompt"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={500}
          placeholder="Ask something…"
          autoComplete="off"
          className="h-11 min-w-0 flex-1 rounded-md border border-line-strong bg-surface px-3.5 text-[16px] outline-none transition placeholder:text-subtle focus:border-ink focus:ring-2 focus:ring-ink/10"
        />
        <div className="grid grid-cols-3 gap-2 lg:flex">
          <button
            type="button"
            onClick={onRunApi}
            disabled={disabled}
            className="h-11 rounded-md border border-line-strong bg-surface px-4 text-[14px] font-medium transition hover:border-api hover:text-api disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run API
          </button>
          <button
            type="button"
            onClick={onRunMcp}
            disabled={disabled}
            className="h-11 rounded-md border border-line-strong bg-surface px-4 text-[14px] font-medium transition hover:border-mcp hover:text-mcp disabled:cursor-not-allowed disabled:opacity-40"
          >
            Run MCP
          </button>
          <button
            type="submit"
            disabled={disabled}
            className="flex h-11 items-center justify-center gap-1.5 rounded-md bg-ink px-5 text-[14px] font-semibold text-canvas transition hover:bg-ink/85 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Play className="size-3.5 fill-current" /> Run Both
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 font-mono text-[10.5px] tracking-[0.14em] text-subtle uppercase">Try</span>
        {PRESET_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onChange(prompt)}
            className={`rounded-full border px-2.5 py-1 text-[12.5px] transition ${
              value === prompt ? "border-ink bg-ink text-canvas" : "border-line bg-canvas text-muted hover:border-line-strong hover:text-ink"
            }`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </Card>
  );
}
