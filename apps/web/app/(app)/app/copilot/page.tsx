import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CopilotRuntimeProvider } from "@/components/copilot/runtime-provider";
import { CopilotThread } from "@/components/copilot/thread";
import { isCopilotConfigured } from "@/lib/agent/anthropic";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Copilot",
  robots: { index: false, follow: false },
};

// Per-user, cookie-bound, model-backed — always request-time.
export const dynamic = "force-dynamic";

export default async function CopilotPage() {
  // Defense in depth: the layout + proxy gate this, re-check at the source.
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirectedFrom=/app/copilot");
  } catch {
    redirect("/login?error=not_configured");
  }

  const configured = isCopilotConfigured();

  return (
    // The (app) layout already provides the dark console shell + header. We
    // stretch the chat to fill the viewport below it.
    <div className="-mx-6 -my-10 flex h-[calc(100svh-3.5rem)] flex-col">
      {!configured ? (
        <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-accent">
            Copilot offline
          </span>
          <p className="font-mono text-sm text-console-muted">
            The copilot needs an Anthropic API key to run. Set{" "}
            <code className="text-console-foreground">ANTHROPIC_API_KEY</code>{" "}
            on this deployment to bring it online.
          </p>
        </div>
      ) : (
        <CopilotRuntimeProvider>
          <CopilotThread />
        </CopilotRuntimeProvider>
      )}
    </div>
  );
}
