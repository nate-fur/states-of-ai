"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { STATES } from "@/lib/map/data";
import type { DetailSelection } from "@/lib/map/types";
import { DetailRail } from "./detail-rail";
import { StateDossierPanel } from "./state-dossier-panel";
import { OutlineSelect } from "./ui";

export function DossierPage({
  abbr,
  compare,
}: {
  abbr: string;
  compare: string | null;
}) {
  const router = useRouter();
  const [detail, setDetail] = useState<DetailSelection | null>(null);
  const selected = STATES.find((s) => s.abbr === abbr);
  const compareState = compare
    ? STATES.find((s) => s.abbr === compare)
    : undefined;

  if (!selected) {
    return (
      <div className="p-8 font-map-mono text-sm text-mute">
        Unknown state.{" "}
        <Link href="/" className="text-ink">
          Back to map
        </Link>
      </div>
    );
  }

  const panels = [selected, compareState].filter(Boolean);

  return (
    <div
      className="mx-auto grid h-screen max-w-[100vw] text-ink transition-[grid-template-columns] duration-[450ms] ease-[cubic-bezier(.2,.7,.2,1)]"
      style={{
        gridTemplateColumns: detail
          ? "minmax(280px, 420px) minmax(480px, 560px)"
          : "minmax(480px, 560px)",
        width: "fit-content",
      }}
    >
      {detail ? (
        <DetailRail
          detail={detail}
          state={detail ? STATES.find((s) => s.abbr === detail.abbr) : undefined}
          onClose={() => setDetail(null)}
          onDetail={setDetail}
          widthClass="w-full min-w-[280px]"
        />
      ) : null}
      <div className="min-w-[480px] overflow-y-auto border-x border-hair px-7 pb-16">
        <div className="sticky top-0 z-[1] flex items-center justify-between gap-3 border-b border-hair bg-paper py-3.5 pb-2.5 font-map-mono text-[11px] uppercase tracking-[0.1em] text-mute">
          <span className="flex items-center gap-3">
            <Link href="/" className="text-mute no-underline hover:text-ink">
              ← Map
            </Link>
            <span>State dossier</span>
          </span>
          <div className="flex items-center gap-2">
            <OutlineSelect
              value={abbr}
              onChange={(e) => {
                const next = e.target.value;
                setDetail(null);
                router.push(
                  `/state/${next}${compare ? `?c=${compare}` : ""}`,
                );
              }}
            >
              {STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.name}
                </option>
              ))}
            </OutlineSelect>
            <OutlineSelect
              value={compare ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDetail(null);
                router.push(v ? `/state/${abbr}?c=${v}` : `/state/${abbr}`);
              }}
            >
              <option value="">Compare…</option>
              {STATES.map((s) => (
                <option key={s.abbr} value={s.abbr}>
                  {s.name}
                </option>
              ))}
            </OutlineSelect>
            {compare && (
              <Link
                href={`/diff?a=${abbr}&b=${compare}`}
                className="border border-ink px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] text-ink no-underline hover:bg-ink hover:text-white"
              >
                Diff
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap">
          {panels.map((p) =>
            p ? (
              <StateDossierPanel
                key={p.abbr}
                state={p}
                detail={detail}
                onDetail={setDetail}
                defaultOpen={{ policy: true, ai: true, local: false }}
              />
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
