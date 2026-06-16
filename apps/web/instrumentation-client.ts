// Client-side PostHog initialization. Next.js runs this file once, before
// React hydration (see node_modules/next/dist/docs/.../instrumentation-client.md).
// This is the ONLY place posthog-js is initialized — per PostHog guidance we do
// NOT also wrap the app in a <PostHogProvider>, which would double-init. Client
// components import the `posthog` singleton from "posthog-js" directly.
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

// Degrade gracefully when unconfigured (e.g. `next build` in CI without secrets,
// or local dev without a key) — mirrors how Supabase/Stripe no-op here.
if (key) {
  posthog.init(key, {
    // Post through the first-party /ingest reverse proxy (next.config.ts) so
    // ad blockers don't drop events. ui_host keeps in-app links pointing at the
    // real PostHog dashboard.
    api_host: "/ingest",
    ui_host: "https://us.posthog.com",
    // Opt into the current PostHog default behaviors (incl. SPA $pageview /
    // $pageleave autocapture for the App Router — no manual pageview hook needed).
    defaults: "2026-01-30",
    // Capture unhandled exceptions into Error Tracking.
    capture_exceptions: true,
    // Belt-and-suspenders with the project-level masking config: never record
    // the contents of input fields in session replay.
    session_recording: {
      maskAllInputs: true,
    },
    debug: process.env.NODE_ENV === "development",
  });
}
