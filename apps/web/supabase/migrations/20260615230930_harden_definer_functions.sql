-- =============================================================================
-- harden_definer_functions — clear two SECURITY advisor warnings on the
-- pre-existing SECURITY DEFINER functions (profiles migration).
-- =============================================================================

-- set_updated_at had a role-mutable search_path. Pin it. now() lives in
-- pg_catalog (always implicitly in scope), so an empty path is safe.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user() is a trigger-only function and must never be callable as an
-- RPC (/rest/v1/rpc/handle_new_user). Revoking EXECUTE does NOT stop the
-- AFTER INSERT trigger from firing — trigger invocation bypasses EXECUTE grants.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;
