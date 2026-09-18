// Which data the map reads. Plain module (no "use client") so both the server
// layout and client components see the real string, not a client reference.
export type MapSource = "seed" | "live";
export const SOURCE_COOKIE = "mapSource";
