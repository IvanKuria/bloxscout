/**
 * Proxy (Next.js 16's renamed Middleware — see node_modules/next/dist/docs/
 * 01-app/03-api-reference/03-file-conventions/proxy.md).
 *
 * Runs before matched routes to refresh the Supabase auth session and gate the
 * private `/app` area. Auth-library work lives in lib/supabase/middleware.ts.
 */
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all request paths except:
     * - api routes (they do their own auth checks)
     * - _next/static, _next/image (build assets)
     * - common metadata / static files
     * This keeps the proxy off the public marketing/data routes' assets while
     * still covering /app (gated) and the auth pages.
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|llms.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
