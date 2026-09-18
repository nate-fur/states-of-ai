import seed from "./seed.json";
import type { StateRecord, RegulationArea } from "./types";

export const TIERS = seed.TIERS as string[];
export const AREAS = seed.AREAS as RegulationArea[];
export const STATES = seed.STATES as StateRecord[];
export const VERIFIED = seed.VERIFIED as string;

export function getState(abbr: string): StateRecord | undefined {
  return STATES.find((s) => s.abbr === abbr.toUpperCase());
}

export function statesByAbbr(): Record<string, StateRecord> {
  return Object.fromEntries(STATES.map((s) => [s.abbr, s]));
}
