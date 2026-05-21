"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface InstallPillProps {
  command: string;
  className?: string;
}

export function InstallPill({ command, className }: InstallPillProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard rejection is silent
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label="Copy install command to clipboard"
      className={cn(
        "group inline-flex items-center gap-3 rounded-md border border-border bg-secondary px-4 py-2.5 font-mono text-sm text-foreground transition-colors hover:border-foreground/30 hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className,
      )}
    >
      <span className="text-muted-foreground select-none">$</span>
      <span className="truncate">{command}</span>
      <span className="ml-1 inline-flex h-4 w-4 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground">
        {copied ? (
          <Check className="h-4 w-4 text-accent" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </span>
    </button>
  );
}
