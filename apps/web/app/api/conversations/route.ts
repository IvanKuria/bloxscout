/**
 * GET /api/conversations — the signed-in user's AI-agent threads (most recent
 * first), for the sidebar. Auth-checked; `isCopilotPreview()` lets the dev
 * preview list (empty when Supabase is unconfigured) without a session.
 *
 * RLS scopes `listConversations()` to the caller, so no user filter is needed
 * here — an unauthenticated request without preview is rejected outright.
 */
import { NextResponse } from "next/server";
import { listConversations } from "@/lib/agent/store";
import { isCopilotPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const preview = isCopilotPreview();
  let authed = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    authed = Boolean(user);
  } catch {
    // Auth not configured — fall through to the preview gate.
  }
  if (!authed && !preview) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const conversations = await listConversations();
  return NextResponse.json(
    { conversations },
    { headers: { "Cache-Control": "no-store" } },
  );
}
