"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as React from "react";
import { Button } from "@/components/ui/button";

/**
 * Light / dark / system toggle. Cycles on click; shows the active mode's icon.
 * Renders a stable placeholder until mounted to avoid hydration mismatch.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  // Mount flag avoids SSR/client theme hydration mismatch (next-themes pattern).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setMounted(true), []);

  const order = ["light", "dark", "system"] as const;
  // Gate on mounted so SSR + first client render agree (avoids hydration drift).
  const current = (mounted ? (theme ?? "system") : "system") as (typeof order)[number];
  const next = order[(order.indexOf(current) + 1) % order.length];

  const Icon = current === "dark" ? Moon : current === "system" ? Monitor : Sun;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      aria-label={`Theme: ${current}. Switch to ${next}.`}
      onClick={() => setTheme(next)}
    >
      <Icon className="size-4" />
    </Button>
  );
}
