"use client";

// Filter chips shared by the data page tabs.

export function count<T>(rows: T[], keys: (r: T) => string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) for (const k of keys(r)) out[k] = (out[k] ?? 0) + 1;
  return out;
}

export function Chips({
  label,
  options,
  active,
  onChange,
  allCount,
}: {
  label: string;
  options: { key: string; label: string; count: number }[];
  active: string | null;
  onChange: (key: string | null) => void;
  allCount: number;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-1.5 font-map-mono text-[11px]">
      <span className="mr-1 uppercase tracking-[0.1em] text-mute">{label}</span>
      <Chip label="All" count={allCount} active={active === null} onClick={() => onChange(null)} />
      {options.map((o) => (
        <Chip
          key={o.key}
          label={o.label}
          count={o.count}
          active={active === o.key}
          onClick={() => onChange(active === o.key ? null : o.key)}
        />
      ))}
    </div>
  );
}

export function Chip({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-baseline gap-1.5 border px-2 py-[3px] ${
        active ? "border-ink bg-ink text-white" : "border-hair bg-transparent text-ink hover:border-ink"
      } ${count === 0 && !active ? "text-dim" : ""}`}
    >
      <span>{label}</span>
      <span className={active ? "text-white/60" : "text-dim"}>{count}</span>
    </button>
  );
}
