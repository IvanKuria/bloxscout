/**
 * TEMPORARY dev-only copilot preview gate.
 *
 * When `COPILOT_PUBLIC_PREVIEW=1`, the `/app` auth gate is bypassed so the
 * copilot can be exercised without a Supabase session during development.
 *
 * ⚠️ Remove this flag (and the call sites in lib/supabase/middleware.ts and
 * app/(app)/layout.tsx) before shipping — it makes the gated area public.
 */
export function isCopilotPreview(): boolean {
  return process.env.COPILOT_PUBLIC_PREVIEW === "1";
}
