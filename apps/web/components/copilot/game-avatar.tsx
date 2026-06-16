"use client";

/**
 * A small, lazy game icon for the agent's data widgets. Falls back gracefully
 * to the game's initial on a tinted tile when no thumbnail is available
 * (pending/blocked/error icons, or a young dataset).
 */
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export function GameAvatar({
  name,
  src,
  className,
}: {
  name: string | null | undefined;
  src: string | null | undefined;
  className?: string;
}) {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <Avatar className={cn("size-10 rounded-lg border border-border", className)}>
      {src ? (
        <AvatarImage src={src} alt="" loading="lazy" decoding="async" />
      ) : null}
      <AvatarFallback className="bg-muted-surface font-heading text-sm font-semibold text-muted-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
