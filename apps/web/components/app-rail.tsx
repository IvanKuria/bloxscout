"use client";

/**
 * Persistent left rail for the authed app (SaaS pattern). Primary nav at the
 * top, the user section (account, settings, theme, sign out) pinned at the
 * bottom — all icon buttons with tooltips. Active state from the pathname.
 */
import { LogOut, MessageSquare, Settings, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { signOut } from "@/app/(auth)/actions";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function RailLink({
  href,
  label,
  active,
  icon: Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Link
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`inline-flex size-10 items-center justify-center rounded-xl transition-colors ${
              active
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          />
        }
      >
        <Icon className="size-5" />
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

export function AppRail({ email }: { email: string | null }) {
  const pathname = usePathname() ?? "";
  const initial = (email?.[0] ?? "?").toUpperCase();

  return (
    <aside className="flex w-16 shrink-0 flex-col items-center border-r border-border bg-muted/30 py-3">
      <Link
        href="/app/copilot"
        aria-label="bloxscout"
        className="mb-4 inline-flex size-10 items-center justify-center"
      >
        <BrandMark className="size-6" />
      </Link>

      {/* Primary nav */}
      <nav className="flex flex-col items-center gap-1">
        <RailLink
          href="/app/copilot"
          label="Copilot"
          icon={MessageSquare}
          active={pathname.startsWith("/app/copilot")}
        />
      </nav>

      <div className="flex-1" />

      {/* User section, pinned to the bottom */}
      <div className="flex flex-col items-center gap-1">
        <RailLink
          href="/app"
          label="Account"
          icon={User}
          active={pathname === "/app"}
        />
        <RailLink
          href="/settings"
          label="Settings"
          icon={Settings}
          active={pathname.startsWith("/settings")}
        />
        <ThemeToggle className="size-10 rounded-xl" />
        <form action={signOut}>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  aria-label="Sign out"
                  className="size-10 rounded-xl text-muted-foreground hover:text-foreground"
                />
              }
            >
              <LogOut className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="right">Sign out</TooltipContent>
          </Tooltip>
        </form>
        <Tooltip>
          <TooltipTrigger
            render={
              <div className="mt-1 grid size-9 place-items-center rounded-full bg-foreground text-xs font-medium text-background" />
            }
          >
            {initial}
          </TooltipTrigger>
          <TooltipContent side="right">{email ?? "Signed in"}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  );
}
