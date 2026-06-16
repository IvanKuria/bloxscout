import { redirect } from "next/navigation";
import { AppRail } from "@/components/app-rail";
import { isCopilotPreview } from "@/lib/preview";
import { createClient } from "@/lib/supabase/server";

// The gated area is always request-time (per-user, cookie-bound). Never
// prerender it · that would also try to read auth env at build time.
export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Defense-in-depth: the proxy already gates /app, but we re-check at the
  // data source. redirect() throws (NEXT_REDIRECT) and must stay OUTSIDE try.
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
    // Auth not configured on this deployment · fall through to the gate below.
  }
  if (!authed && !preview) redirect("/login?redirectedFrom=/app");

  return (
    <div className="flex h-svh bg-background text-foreground">
      <AppRail email={email} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
