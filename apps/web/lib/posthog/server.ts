import "server-only";
import { PostHog } from "posthog-node";

// Server-side PostHog client for API routes, server actions, and webhooks.
// Singleton so we reuse one HTTP agent across requests in a warm lambda.
//
// Everything no-ops gracefully when NEXT_PUBLIC_POSTHOG_KEY is unset, matching
// how the rest of the app degrades without secrets (so `next build` succeeds).

let client: PostHog | null = null;
let resolved = false;

/** The shared posthog-node client, or null when analytics is unconfigured. */
export function getPostHogServer(): PostHog | null {
  if (resolved) return client;
  resolved = true;

  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return null;

  client = new PostHog(key, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
    // Serverless: send eagerly rather than batching, so events aren't lost when
    // the function is frozen/torn down between invocations. We still flush()
    // explicitly at the end of each handler for safety.
    flushAt: 1,
    flushInterval: 0,
  });
  return client;
}

/**
 * Fire-and-(awaitable) capture that no-ops when analytics is off. Pass the
 * client-forwarded `X-POSTHOG-DISTINCT-ID` header as `distinctId` so server
 * events stitch to the same person as the browser; fall back to the user id.
 */
export function captureServer(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): void {
  const ph = getPostHogServer();
  if (!ph) return;
  ph.capture({ distinctId, event, properties });
}

/** Capture an exception to Error Tracking. No-ops when analytics is off. */
export function captureServerException(
  distinctId: string,
  error: unknown,
  properties?: Record<string, unknown>,
): void {
  const ph = getPostHogServer();
  if (!ph) return;
  ph.captureException(error, distinctId, properties);
}

/**
 * Flush pending events. ALWAYS await this before a handler returns (ideally in
 * a `finally`) — otherwise serverless teardown can drop in-flight events. Safe
 * to call when analytics is off.
 */
export async function flushPostHog(): Promise<void> {
  const ph = getPostHogServer();
  if (!ph) return;
  try {
    await ph.flush();
  } catch {
    // Never let analytics flushing break the request.
  }
}

/**
 * Resolve the distinct id for server-side capture: prefer the browser's
 * PostHog distinct id (forwarded as a header) so events attribute to the same
 * person; fall back to the authenticated user id.
 */
export function distinctIdFrom(
  request: Request,
  fallbackUserId: string,
): string {
  return request.headers.get("x-posthog-distinct-id") || fallbackUserId;
}
