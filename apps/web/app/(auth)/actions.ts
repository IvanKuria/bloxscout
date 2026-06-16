"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AuthState {
  error?: string;
  message?: string;
}

// Discord OAuth is initiated from the browser client (see auth-form.tsx) so the
// PKCE code-verifier cookie is written client-side and survives the redirect to
// Discord. Initiating it from a server action drops that cookie on the external
// redirect, causing "PKCE code verifier not found in storage" at callback.

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
