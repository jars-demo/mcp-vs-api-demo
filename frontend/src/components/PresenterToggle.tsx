import { Presentation } from "lucide-react";

export function PresenterToggle({ enabled, onChange }: { enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5 text-[12.5px] font-medium transition hover:border-line-strong"
    >
      <Presentation className="size-3.5" />
      Presenter Mode
      <span className={`relative h-4 w-7 rounded-full transition ${enabled ? "bg-ink" : "bg-line-strong"}`}>
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-surface shadow-sm transition-all ${enabled ? "left-3.5" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}
