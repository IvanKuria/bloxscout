"use client";

/**
 * AgentApp — the logged-in AI agent surface: a conversation sidebar + the chat
 * thread, ChatGPT/Claude-style.
 *
 * Owns the source of truth for the thread list and the active selection so the
 * sidebar and thread stay in lockstep without round-trips:
 *   - On mount it fetches the user's threads from `/api/conversations`.
 *   - Selecting a thread switches the active id; the thread remounts (keyed by
 *     id) and hydrates its saved messages + widgets.
 *   - "New chat" clears the active id (a fresh thread). On its first send the
 *     server returns `X-Conversation-Id`; the thread reports it up and we splice
 *     the new thread into the sidebar optimistically (title = first message).
 *   - Rename / delete call the per-thread API and update the list locally.
 *
 * Collapsible rail on desktop; a Sheet on mobile.
 */
import { Menu, PanelLeft } from "lucide-react";
import * as React from "react";
import {
  ConversationSidebar,
  type ConversationSummary,
} from "@/components/copilot/sidebar";
import { CopilotThread } from "@/components/copilot/thread";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function deriveTitle(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  return t.length > 60 ? `${t.slice(0, 57)}…` : t || "New thread";
}

export function AgentApp() {
  const [conversations, setConversations] = React.useState<
    ConversationSummary[]
  >([]);
  const [loadingList, setLoadingList] = React.useState(true);
  // `activeId` drives the sidebar highlight + toolbar title (set on both select
  // AND on a fresh chat's first-send creation). `hydrateId` is what the MOUNTED
  // thread loads from — set ONLY when opening a past thread, never on creation,
  // so creating a conversation mid-stream doesn't remount/re-hydrate (which
  // would wipe the in-flight messages). The thread tracks its own id internally.
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [hydrateId, setHydrateId] = React.useState<string | null>(null);
  // A monotonically-bumped key forces the thread to remount for "New chat" /
  // when switching threads — but NOT when a conversation is just created.
  const [threadKey, setThreadKey] = React.useState(0);
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/conversations", {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error("list failed");
        const data = (await res.json()) as {
          conversations: ConversationSummary[];
        };
        if (!cancelled) setConversations(data.conversations ?? []);
      } catch {
        if (!cancelled) setConversations([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectThread = React.useCallback((id: string) => {
    setActiveId(id);
    setHydrateId(id);
    setThreadKey((k) => k + 1);
    setMobileOpen(false);
  }, []);

  const newChat = React.useCallback(() => {
    setActiveId(null);
    setHydrateId(null);
    setThreadKey((k) => k + 1);
    setMobileOpen(false);
  }, []);

  // A fresh thread got its server id on first send — splice it in + select it.
  const handleCreated = React.useCallback((id: string) => {
    setActiveId(id);
    setConversations((prev) =>
      prev.some((c) => c.id === id)
        ? prev
        : [
            {
              id,
              title: "New thread",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            ...prev,
          ],
    );
  }, []);

  const handleTitle = React.useCallback((id: string, firstMessage: string) => {
    const title = deriveTitle(firstMessage);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, title, updatedAt: new Date().toISOString() }
          : c,
      ),
    );
  }, []);

  const renameThread = React.useCallback((id: string, title: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title } : c)),
    );
    void fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }).catch(() => {});
  }, []);

  const deleteThread = React.useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) newChat();
      void fetch(`/api/conversations/${id}`, { method: "DELETE" }).catch(
        () => {},
      );
    },
    [activeId, newChat],
  );

  const sidebar = (variant: "panel" | "sheet") => (
    <ConversationSidebar
      conversations={conversations}
      activeId={activeId}
      loading={loadingList}
      onSelect={selectThread}
      onNewChat={newChat}
      onRename={renameThread}
      onDelete={deleteThread}
      onCollapse={() => setCollapsed(true)}
      variant={variant}
    />
  );

  return (
    <div className="flex h-full w-full">
      {/* Desktop rail */}
      {!collapsed ? (
        <aside className="hidden w-[17rem] shrink-0 border-r border-border md:block">
          {sidebar("panel")}
        </aside>
      ) : null}

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={(open) => setMobileOpen(open)}>
        <SheetContent>{sidebar("sheet")}</SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Compact in-thread toolbar: mobile menu + desktop expand-rail */}
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:px-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open conversations"
            className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted-surface hover:text-foreground md:hidden"
          >
            <Menu className="size-4" />
          </button>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              aria-label="Expand conversations"
              className="hidden size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted-surface hover:text-foreground md:grid"
            >
              <PanelLeft className="size-4" />
            </button>
          ) : null}
          <span className="truncate text-sm font-medium text-foreground">
            {activeId
              ? (conversations.find((c) => c.id === activeId)?.title ??
                "Conversation")
              : "New chat"}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <CopilotThread
            key={`thread-${threadKey}`}
            conversationId={hydrateId}
            onConversationCreated={handleCreated}
            onTitle={handleTitle}
          />
        </div>
      </div>
    </div>
  );
}
