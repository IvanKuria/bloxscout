/**
 * Session-refresh helper for the proxy (Next 16's renamed middleware layer).
 *
 * On every matched request this:
 *   1. creates a request-bound Supabase server client,
 *   2. calls `getUser()` to refresh the auth token if needed (writing any
 *      rotated cookies onto the outgoing response),
 *   3. redirects unauthenticated traffic away from the gated `/app` area.
 *
 * IMPORTANT (Supabase SSR contract): do not run logic between creating the
 * client and calling `getUser()`, and always return the `supabaseResponse`
 * object unmodified (or copy its cookies onto any new response) so the
 * refreshed session cookies are not dropped.
 */
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./env";

/** Path prefixes that require an authenticated session. */
const PROTECTED_PREFIXES = ["/app"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // If Supabase isn't configured (e.g. CI / preview without secrets), don't
  // attempt auth — just pass the request through so the build/runtime is happy.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refresh the session. Do NOT insert code between client creation and here.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );

  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectedFrom", path);
    return NextResponse.redirect(url);
  }

  // Must return the (possibly cookie-bearing) supabaseResponse so the
  // refreshed session is persisted to the browser.
  return supabaseResponse;
}
