import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AgentApp } from "@/components/copilot/agent-app";
import { isCopilotConfigured } from "@/lib/agent/anthropic";
import { isCopilotPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "AI agent",
  robots: { index: false, follow: false },
};

// Per-user, cookie-bound, model-backed — always request-time.
export const dynamic = "force-dynamic";

export default async function AgentPage() {
  // Defense in depth: the layout + proxy gate this, re-check at the source.
  // redirect() throws (NEXT_REDIRECT) — keep it OUTSIDE the try/catch.
  const preview = isCopilotPreview();
  let authed = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) authed = true;
  } catch {
    // Auth not configured — fall through to the gate below.
  }
  if (!authed && !preview) redirect("/login?redirectedFrom=/app/copilot");

  const configured = isCopilotConfigured();

  // The (app) layout provides the header; we fill the rest of the viewport.
  if (!configured) {
    return (
      <div className="mx-auto flex h-full max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
          Agent offline
        </span>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The agent needs an Anthropic API key to run. Set{" "}
          <code className="rounded bg-muted-surface px-1 py-0.5 font-mono text-foreground">
            ANTHROPIC_API_KEY
          </code>{" "}
          on this deployment to bring it online.
        </p>
      </div>
    );
  }

  return <AgentApp />;
}
