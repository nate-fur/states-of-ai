import posthog from "posthog-js";

// Usage analytics. Only production builds report, so `next dev` sessions
// stay out of the numbers. Events go through the /ingest rewrite in
// next.config.ts, which keeps them first-party and past most ad blockers.
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

if (key && process.env.NODE_ENV === "production") {
  posthog.init(key, {
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // Pageviews on client-side navigation, pageleave, and autocaptured clicks.
    defaults: "2026-08-30",
    // Visitors are anonymous; don't create a person profile for each one.
    person_profiles: "identified_only",
    disable_session_recording: true,
  });
  // Vercel sets this to "production" or "preview". Preview traffic lands in
  // the same project; the project's test-account filter keeps it out of the
  // default numbers. Local `next start` builds report as "local".
  posthog.register({
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "local",
  });
}
