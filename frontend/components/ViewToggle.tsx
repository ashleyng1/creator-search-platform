"use client";

type ViewMode = "list" | "grid";

export function ViewToggle({
  mode,
  onChange,
}: {
  mode: ViewMode;
  onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-surface-border bg-white p-0.5">
      <button
        type="button"
        onClick={() => onChange("list")}
        title="List view"
        className={`rounded px-2.5 py-1.5 ${
          mode === "list" ? "bg-brand-100 text-brand-700" : "text-neutral-500 hover:text-neutral-700"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => onChange("grid")}
        title="Grid view"
        className={`rounded px-2.5 py-1.5 ${
          mode === "grid" ? "bg-brand-100 text-brand-700" : "text-neutral-500 hover:text-neutral-700"
        }`}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeWidth={2} d="M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z" />
        </svg>
      </button>
    </div>
  );
}
