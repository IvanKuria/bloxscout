"use client";

/**
 * Conversation sidebar for the AI agent · ChatGPT/Claude-style.
 *
 * Owns the thread list (title + relative time), the active selection, "New
 * chat", and per-thread rename + delete via the `/api/conversations` routes.
 * Collapsible on desktop (rail), and rendered inside a Sheet on mobile (the
 * parent passes `variant="sheet"` to drop the outer frame).
 *
 * The list is a controlled surface: the parent (`AgentApp`) owns the source of
 * truth so a brand-new thread (returned as `X-Conversation-Id` on the first
 * send) can be spliced in without a refetch.
 */
import {
  Check,
  MessageSquarePlus,
  MoreHorizontal,
  PanelLeftClose,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Compact relative time, e.g. "just now", "4h", "3d", "Mar 2". */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function ConversationRow({
  conversation,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  conversation: ConversationSummary;
  active: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(conversation.title);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    const next = draft.trim();
    setEditing(false);
    if (next && next !== conversation.title) onRename(next);
    else setDraft(conversation.title);
  };

  if (editing) {
    return (
      <div className="flex items-center gap-1 rounded-lg border border-accent/40 bg-card px-2 py-1.5">
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(conversation.title);
              setEditing(false);
            }
          }}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
        />
        <button
          type="button"
          onClick={commit}
          aria-label="Save"
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Check className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(conversation.title);
            setEditing(false);
          }}
          aria-label="Cancel"
          className="grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group/row relative flex items-center rounded-lg transition-colors",
        active ? "bg-muted-surface" : "hover:bg-muted-surface/60",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg px-3 py-2 text-left"
      >
        <span
          className={cn(
            "truncate text-sm leading-tight",
            active ? "font-medium text-foreground" : "text-foreground/80",
          )}
        >
          {conversation.title || "New thread"}
        </span>
        <span className="text-[11px] text-muted-foreground">
          {relativeTime(conversation.updatedAt)}
        </span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Thread options"
          className={cn(
            "mr-1 grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none transition-opacity",
            "hover:bg-muted hover:text-foreground focus-visible:opacity-100 aria-expanded:opacity-100",
            "opacity-0 group-hover/row:opacity-100",
          )}
        >
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setEditing(true)}>
            <Pencil />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={onDelete}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ConversationSidebar({
  conversations,
  activeId,
  loading,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onCollapse,
  variant = "panel",
}: {
  conversations: ConversationSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  /** Collapse the desktop rail (hidden in the sheet). */
  onCollapse?: () => void;
  variant?: "panel" | "sheet";
}) {
  return (
    <div className="flex h-full flex-col bg-muted-surface/40">
      <div className="flex items-center justify-between gap-2 px-3 pt-4 pb-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Conversations
        </span>
        {variant === "panel" && onCollapse ? (
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse sidebar"
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex w-full items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs transition-colors hover:border-accent/40 hover:bg-card"
        >
          <MessageSquarePlus className="size-4 text-accent" />
          New chat
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {loading ? (
          <ul className="flex flex-col gap-1">
            {[0, 1, 2, 3].map((i) => (
              <li
                key={i}
                className="h-11 animate-pulse rounded-lg bg-muted-surface"
              />
            ))}
          </ul>
        ) : conversations.length === 0 ? (
          <p className="px-3 py-6 text-center text-xs leading-relaxed text-muted-foreground">
            No conversations yet. Start one to see it saved here.
          </p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {conversations.map((c) => (
              <li key={c.id}>
                <ConversationRow
                  conversation={c}
                  active={c.id === activeId}
                  onSelect={() => onSelect(c.id)}
                  onRename={(title) => onRename(c.id, title)}
                  onDelete={() => onDelete(c.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
