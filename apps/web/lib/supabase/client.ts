/**
 * Supabase client for the browser (Client Components).
 *
 * IMPORTANT: read the public env via *literal* `process.env.NEXT_PUBLIC_*`
 * references. Next.js only statically inlines `NEXT_PUBLIC_*` vars into the
 * client bundle when accessed by literal name — the dynamic `process.env[name]`
 * helper in `env.ts` is NOT inlined and evaluates to `undefined` in the browser
 * (it works server-side only). Created on demand so nothing throws at module load.
 */
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in the " +
        "client bundle. Set them in the deployment env and rebuild (NEXT_PUBLIC " +
        "vars are inlined at build time).",
    );
  }
  return createBrowserClient(url, anonKey);
}
