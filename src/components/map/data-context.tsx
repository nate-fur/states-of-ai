"use client";

import { createContext, useContext, useState } from "react";
import { AREAS as SEED_AREAS, STATES as SEED_STATES, VERIFIED as SEED_VERIFIED } from "@/lib/map/data";
import type { RegulationArea, StateRecord } from "@/lib/map/types";

// The map can read either the checked-in seed JSON or what the pipelines put
// in Convex. Both are loaded up front; the toggle just switches which one
// the components see. The choice is kept in a cookie so it survives reloads
// and is known on the server, which avoids a flash on first paint.

import { SOURCE_COOKIE, type MapSource } from "@/lib/map/source";

export type { MapSource };

export type LiveData = { STATES: StateRecord[]; AREAS: RegulationArea[]; VERIFIED: string };

type MapData = {
  STATES: StateRecord[];
  AREAS: RegulationArea[];
  VERIFIED: string;
  source: MapSource;
  setSource: (s: MapSource) => void;
  hasLive: boolean;
  /** Footer line under panels: what the reader is looking at. */
  caption: string;
};

const Ctx = createContext<MapData | null>(null);

export function MapDataProvider({
  live,
  initialSource,
  children,
}: {
  live: LiveData | null;
  initialSource: MapSource;
  children: React.ReactNode;
}) {
  const [source, setSourceState] = useState<MapSource>(live && initialSource === "live" ? "live" : "seed");
  const setSource = (s: MapSource) => {
    setSourceState(s);
    document.cookie = `${SOURCE_COOKIE}=${s}; path=/; max-age=31536000; samesite=lax`;
  };
  const useLive = source === "live" && live !== null;
  const value: MapData = {
    STATES: useLive ? live.STATES : SEED_STATES,
    AREAS: useLive && live.AREAS.length ? live.AREAS : SEED_AREAS,
    VERIFIED: useLive ? live.VERIFIED : SEED_VERIFIED,
    source: useLive ? "live" : "seed",
    setSource,
    hasLive: live !== null,
    caption: useLive
      ? `Live data from Convex. Scores use placeholder formulas. Last updated ${live.VERIFIED}.`
      : `Sample data, illustrative only. Last verified ${SEED_VERIFIED}.`,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMapData(): MapData {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMapData must be used inside MapDataProvider");
  return v;
}

/** Two-way switch between the seed JSON and live Convex data. */
export function SourceToggle({ className = "" }: { className?: string }) {
  const { source, setSource, hasLive } = useMapData();
  const opt = (s: MapSource, label: string) => (
    <button
      key={s}
      type="button"
      disabled={s === "live" && !hasLive}
      onClick={() => setSource(s)}
      title={s === "live" && !hasLive ? "Convex is not configured" : undefined}
      className={`px-2.5 py-[5px] font-map-mono text-[11px] uppercase tracking-[0.08em] disabled:cursor-not-allowed disabled:text-dim ${
        source === s ? "bg-ink text-white" : "bg-paper text-ink hover:bg-hair"
      }`}
    >
      {label}
    </button>
  );
  return (
    <span className={`inline-flex border border-ink ${className}`}>
      {opt("seed", "Seed")}
      {opt("live", "Live")}
    </span>
  );
}
