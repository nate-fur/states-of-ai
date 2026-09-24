import posthog from "posthog-js";
import type { DetailSelection } from "@/lib/map/types";

/**
 * Named usage events. Autocapture already records raw clicks, but a click on
 * a map state arrives as "clicked path" with no state attached; these carry
 * the state, area or bill so PostHog can break them down.
 */
type Events = {
  state_selected: { state: string; from: "map" | "state_page" };
  state_compared: { state: string; compare: string };
  dossier_section_toggled: { state: string; section: string; open: boolean };
  detail_opened: { state: string; area?: string; bill?: string };
  bill_reader_opened: { state: string; bill: string; section?: string };
  map_mode_changed: { mode: string };
};

export function track<E extends keyof Events>(event: E, props: Events[E]) {
  // PostHog only initializes in production builds with a key; elsewhere this is a no-op.
  if (!posthog.__loaded) return;
  posthog.capture(event, props);
}

export function trackDetail(d: DetailSelection | null) {
  if (!d) return;
  track("detail_opened", d.bill ? { state: d.abbr, bill: d.bill } : { state: d.abbr, area: d.k });
}

/** `key` is a billKey(): "<state>:<number>". */
export function trackReader(key: string, section?: string) {
  const i = key.indexOf(":");
  track("bill_reader_opened", { state: key.slice(0, i), bill: key.slice(i + 1), section });
}
