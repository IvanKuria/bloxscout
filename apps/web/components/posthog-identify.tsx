"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { createClient } from "@/lib/supabase/client";

// Binds the PostHog person to the Supabase-authenticated user. Mounted once in
// the root layout. On sign-in we identify by user id (so anonymous pre-login
// events stitch to the account); on sign-out we reset to a fresh anonymous id.
//
// Renders nothing. No-ops when PostHog or Supabase is unconfigured.
export function PostHogIdentify() {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;

    let supabase: ReturnType<typeof createClient>;
    try {
      supabase = createClient();
    } catch {
      // Supabase env not present — nothing to identify against.
      return;
    }

    function sync(user: { id: string; email?: string | null } | null) {
      if (user) {
        posthog.identify(user.id, user.email ? { email: user.email } : undefined);
      }
    }

    // Initial session.
    supabase.auth.getUser().then(({ data }) => sync(data.user ?? null));

    // React to later sign-in / sign-out within the SPA session.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        posthog.reset();
        return;
      }
      sync(session?.user ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return null;
}
