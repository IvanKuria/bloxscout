"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

/** Resolve the absolute site origin for building auth redirect URLs. */
async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  // Fall back to the request's own origin (covers preview deployments).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

/** Begin a Discord OAuth flow; redirects the browser to Discord. */
export async function signInWithDiscord(): Promise<AuthState> {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  try {
    supabase = await createClient();
  } catch {
    return { error: "Auth is not configured on this deployment." };
  }

  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${origin}/auth/callback?next=/app`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (data.url) {
    redirect(data.url);
  }
  return { error: "Could not start Discord sign-in." };
}

/** Sign the current user out and return to the home page. */
export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // No-op if auth isn't configured.
  }
  redirect("/");
}
