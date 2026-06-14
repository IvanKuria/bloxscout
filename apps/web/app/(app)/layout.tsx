import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { Button } from "@/components/ui/button";
import { site } from "@/lib/site";
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
  let email: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login?redirectedFrom=/app");
    email = user.email ?? null;
  } catch {
    // Auth not configured on this deployment.
    redirect("/login?error=not_configured");
  }

  return (
    <div className="flex min-h-svh flex-col bg-console text-console-foreground">
      <header className="sticky top-0 z-50 border-b border-console-border bg-console/85 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-2 font-mono text-sm font-semibold tracking-tight text-console-foreground"
          >
            <span
              className="recon-pulse inline-block h-2 w-2 rounded-full bg-accent"
              aria-hidden
            />
            {site.name}
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-console-muted">
              / console
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden font-mono text-xs text-console-muted sm:inline">
              {email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-console-muted hover:bg-white/5 hover:text-console-foreground"
              >
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
