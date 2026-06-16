"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export interface SettingsActionState {
  error?: string;
}

/**
 * Sign the current user out of EVERY session (all devices), then return home.
 * `redirect` throws (NEXT_REDIRECT), so it lives outside the try/catch.
 */
export async function signOutEverywhere(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // No-op if auth isn't configured on this deployment.
  }
  redirect("/");
}

/**
 * Permanently delete the CURRENTLY authenticated user's account.
 *
 * Guard: we resolve the user id from the request-bound (cookie) session and
 * only ever delete that id — never an arbitrary id supplied by the caller. The
 * service-role client is required because `auth.admin.deleteUser` bypasses RLS,
 * but it is scoped here to the verified caller only.
 */
export async function deleteAccount(): Promise<SettingsActionState | void> {
  let userId: string | null = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    return { error: "Auth is not configured on this deployment." };
  }

  if (!userId) {
    return { error: "You must be signed in to delete your account." };
  }

  try {
    const admin = createServiceRoleClient();
    // Only ever the verified caller's own id.
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) {
      return { error: error.message };
    }
  } catch {
    return { error: "Could not delete your account. Try again." };
  }

  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch {
    // Session is already invalid once the user is deleted; ignore.
  }

  redirect("/");
}
