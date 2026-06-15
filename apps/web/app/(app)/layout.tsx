import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/brand-mark";
import { isCopilotPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";

// The gated area is always request-time (per-user, cookie-bound). Never
// prerender it — that would also try to read auth env at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: the proxy already gates /app, but we re-check at the
  // data source per the Next.js auth guidance (don't rely on proxy alone).
  // NOTE: redirect() throws (NEXT_REDIRECT) and must live OUTSIDE the try/catch
  // so it isn't swallowed.
  const preview = isCopilotPreview();
  let email: string | null = null;
  let authed = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      authed = true;
      email = user.email ?? null;
    }
  } catch {
    // Auth not configured on this deployment — fall through to the gate below.
  }
  if (!authed && !preview) redirect("/login?redirectedFrom=/app");

  return (
    <div className="flex h-svh flex-col bg-background text-foreground">
      <header className="z-30 shrink-0 border-b border-border bg-background">
        <div className="flex h-14 items-center justify-between px-4 sm:px-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 text-sm font-medium tracking-[-0.01em] text-foreground"
          >
            <BrandMark className="size-5" />
            bloxscout
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              / agent
            </span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {preview && !authed && (
              <span className="rounded-md border border-accent/40 bg-accent/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-accent">
                preview · auth bypassed
              </span>
            )}
            <span className="hidden text-xs text-muted-foreground sm:inline">
              {email}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1">{children}</main>
    </div>
  );
}
