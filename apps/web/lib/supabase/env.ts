/**
 * Centralized, lazy access to the Supabase environment.
 *
 * These are read *inside* request handlers / component renders — never at
 * module top-level — so that `next build` (which evaluates modules and
 * prerenders public pages) succeeds even when no secrets are present in CI.
 * Each accessor throws a clear runtime error only when actually invoked
 * without the required variable.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable "${name}". ` +
        `Auth/billing is not configured — see apps/web/.env.example.`,
    );
  }
  return value;
}

export function supabaseUrl(): string {
  return required("NEXT_PUBLIC_SUPABASE_URL");
}

export function supabaseAnonKey(): string {
  return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

export function supabaseServiceRoleKey(): string {
  return required("SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * Whether the public (browser-safe) Supabase config is present. Lets UI
 * degrade gracefully (e.g. hide auth buttons) instead of throwing at render.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
