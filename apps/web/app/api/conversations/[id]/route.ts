/**
 * Per-thread AI-agent API.
 *   GET    /api/conversations/[id]  → the thread's messages (for hydration)
 *   PATCH  /api/conversations/[id]  → rename ({ title })
 *   DELETE /api/conversations/[id]  → delete the thread (+ messages, cascade)
 *
 * All ops are owner-only at the data layer (Supabase RLS), so the handler only
 * gates "is there a caller at all" (auth, or `isCopilotPreview()` in dev).
 */
import { type NextRequest, NextResponse } from "next/server";
import {
  deleteConversation,
  loadMessages,
  renameConversation,
} from "@/lib/agent/store";
import { isCopilotPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Returns true when the request may touch conversation data. */
async function authorized(): Promise<boolean> {
  if (isCopilotPreview()) return true;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return Boolean(user);
  } catch {
    return false;
  }
}

const UNAUTH = NextResponse.json(
  { error: "Not authenticated." },
  { status: 401 },
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorized())) return UNAUTH;
  const { id } = await params;
  const messages = await loadMessages(id);
  return NextResponse.json(
    { messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorized())) return UNAUTH;
  const { id } = await params;
  let body: { title?: string };
  try {
    body = (await request.json()) as { title?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const title = (body.title ?? "").trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  await renameConversation(id, title);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await authorized())) return UNAUTH;
  const { id } = await params;
  await deleteConversation(id);
  return NextResponse.json({ ok: true });
}
