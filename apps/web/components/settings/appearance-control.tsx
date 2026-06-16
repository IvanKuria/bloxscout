"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
] as const;

type ThemeValue = (typeof OPTIONS)[number]["value"];

/**
 * Segmented light / dark / system selector backed by `next-themes`.
 * Renders an inert placeholder until mounted to avoid hydration mismatch.
 */
export function AppearanceControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // Mount flag avoids SSR/client theme hydration mismatch (next-themes pattern).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const current = (mounted ? (theme ?? "system") : "system") as ThemeValue;

  return (
    <div
      role="radiogroup"
      aria-label="Appearance"
      className="inline-flex w-full max-w-xs items-center gap-1 rounded-xl border border-border bg-muted p-1"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!mounted}
            onClick={() => setTheme(value)}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}
