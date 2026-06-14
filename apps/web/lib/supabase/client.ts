/**
 * Supabase client for the browser (Client Components).
 *
 * Reads only the public (NEXT_PUBLIC_*) env, which Next inlines at build time.
 * Created on demand via `createClient()` so nothing throws at module load.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "./env";

export function createClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
