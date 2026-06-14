/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 *
 * Uses the modern `@supabase/ssr` cookie-based pattern: the client reads and
 * writes the auth session through Next's `cookies()` store. Created lazily
 * (per request) so no env access happens at module load — keeps `next build`
 * working without secrets.
 */
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./env";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // `setAll` was called from a Server Component, where mutating
          // cookies is not allowed. This is safe to ignore when session
          // refresh is handled by the proxy (middleware) layer.
        }
      },
    },
  });
}

/**
 * Service-role client — bypasses RLS. SERVER ONLY (e.g. the Stripe webhook).
 * Does not persist/refresh sessions and ignores cookies. Created lazily.
 */
export function createServiceRoleClient() {
  // Env is read here (inside the function), not at import time, so bundling
  // this module never requires secrets to be present.
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
