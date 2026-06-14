/**
 * Conversation persistence DAL (Supabase).
 *
 * Threads + messages are stored owner-only (RLS) so users can resume research
 * and replay widgets. Everything here is BEST-EFFORT: if Supabase isn't
 * configured (or a write fails), the functions degrade silently — the live
 * chat keeps working, it just isn't saved. This keeps `next build` and a
 * keyless local demo functional.
 *
 * Message rows store `role`, `text`, and a `widgets` JSONB array (the
 * tool-call/result payloads) so a reloaded thread re-renders the same inline
 * widgets without re-running the agent.
 */
import "server-only";
import { randomUUID } from "node:crypto";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export interface WidgetPayload {
  toolCallId: string;
  toolName: string;
  args: unknown;
  result: unknown;
  isError?: boolean;
}

export interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  widgets: WidgetPayload[];
  createdAt: string;
}

export interface StoredConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Short, human title from the first user message. */
function deriveTitle(firstMessage: string): string {
  const t = firstMessage.trim().replace(/\s+/g, " ");
  return t.length > 64 ? `${t.slice(0, 61)}…` : t || "New thread";
}

async function db() {
  if (!isSupabaseConfigured()) return null;
  try {
    return await createClient();
  } catch {
    return null;
  }
}

/**
 * Resolve or create the conversation for this turn. Returns an id even when
 * persistence is unavailable (a fresh UUID), so the client always gets a
 * stable thread handle back via the response header.
 */
export async function ensureConversation(
  userId: string,
  conversationId: string | null,
  firstMessage: string,
): Promise<string> {
  const supabase = await db();
  if (!supabase || userId === "anonymous") {
    return conversationId ?? randomUUID();
  }
  if (conversationId) return conversationId;
  const id = randomUUID();
  try {
    await supabase.from("conversations").insert({
      id,
      user_id: userId,
      title: deriveTitle(firstMessage),
    });
  } catch {
    // ignore — best effort
  }
  return id;
}

export async function appendUserMessage(
  conversationId: string,
  text: string,
): Promise<void> {
  const supabase = await db();
  if (!supabase) return;
  try {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "user",
      text,
      widgets: [],
    });
  } catch {
    // ignore
  }
}

export async function appendAssistantMessage(
  conversationId: string,
  text: string,
  widgets: WidgetPayload[],
): Promise<void> {
  const supabase = await db();
  if (!supabase) return;
  try {
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      text,
      widgets,
    });
    // Touch the conversation so it sorts to the top of the thread list.
    await supabase
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);
  } catch {
    // ignore
  }
}

/** Load a user's threads (most recent first). Empty when unconfigured. */
export async function listConversations(): Promise<StoredConversation[]> {
  const supabase = await db();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(50);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      createdAt: r.created_at as string,
      updatedAt: r.updated_at as string,
    }));
  } catch {
    return [];
  }
}

/** Load a thread's messages in order, for replay. Empty when unconfigured. */
export async function loadMessages(
  conversationId: string,
): Promise<StoredMessage[]> {
  const supabase = await db();
  if (!supabase) return [];
  try {
    const { data } = await supabase
      .from("messages")
      .select("id, role, text, widgets, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      role: r.role as "user" | "assistant",
      text: r.text as string,
      widgets: (r.widgets as WidgetPayload[]) ?? [],
      createdAt: r.created_at as string,
    }));
  } catch {
    return [];
  }
}
