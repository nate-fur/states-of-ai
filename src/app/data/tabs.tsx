"use client";

import { useState } from "react";

export type Tab = { title: string; count: number; content: React.ReactNode };

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="flex gap-6 border-b border-hair font-map-mono text-[11px] uppercase tracking-[0.1em]">
        {tabs.map((t, i) => (
          <button
            key={t.title}
            type="button"
            onClick={() => setActive(i)}
            className={`-mb-px flex items-baseline gap-2 border-b-2 bg-transparent px-0 py-2.5 ${
              i === active ? "border-ink text-ink" : "border-transparent text-mute hover:text-ink"
            }`}
          >
            <span>{t.title}</span>
            <span className="text-dim">{t.count}</span>
          </button>
        ))}
      </div>
      <div className="pt-6">{tabs[active]?.content}</div>
    </div>
  );
}
