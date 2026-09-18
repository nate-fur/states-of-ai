import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Both entrypoints return early unless PIPELINES_ENABLED=true is set on the
// deployment (see pipelines.ts), so pushing this file to dev is safe.
const crons = cronJobs();

crons.weekly(
  "legiscan bills",
  { dayOfWeek: "monday", hourUTC: 6, minuteUTC: 0 },
  internal.legiscan.sync.runAll,
  {},
);

crons.weekly(
  "compute atlas facilities",
  { dayOfWeek: "monday", hourUTC: 5, minuteUTC: 0 },
  internal.computeAtlas.sync.run,
  {},
);

export default crons;
