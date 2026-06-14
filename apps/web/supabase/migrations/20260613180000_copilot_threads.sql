-- =============================================================================
-- copilot threads — conversations + messages for the AI copilot.
-- Owner-only RLS. Messages store role, text, and a `widgets` JSONB payload
-- (the tool-call/result objects) so a reloaded thread re-renders the same
-- inline data widgets without re-running the agent.
--
-- Depends on public.set_updated_at() (created in the profiles migration).
-- =============================================================================

create table if not exists public.conversations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null default 'New thread',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.conversations is
  'Copilot chat threads, owned 1:N by a user. Owner-only access via RLS.';

create index if not exists conversations_user_id_updated_idx
  on public.conversations (user_id, updated_at desc);

drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null
                    references public.conversations (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  text            text not null default '',
  -- Tool-call / rendered-widget payloads for replay:
  -- [{ toolCallId, toolName, args, result, isError }]
  widgets         jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now()
);

comment on table public.messages is
  'Copilot messages within a conversation. `widgets` holds the tool-call '
  'payloads so threads replay their inline data widgets.';

create index if not exists messages_conversation_created_idx
  on public.messages (conversation_id, created_at asc);

-- Row Level Security ----------------------------------------------------------
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- conversations: full owner CRUD on own rows.
drop policy if exists "Owner can view own conversations" on public.conversations;
create policy "Owner can view own conversations"
  on public.conversations for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Owner can insert own conversations" on public.conversations;
create policy "Owner can insert own conversations"
  on public.conversations for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owner can update own conversations" on public.conversations;
create policy "Owner can update own conversations"
  on public.conversations for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Owner can delete own conversations" on public.conversations;
create policy "Owner can delete own conversations"
  on public.conversations for delete
  using ((select auth.uid()) = user_id);

-- messages: scoped through the parent conversation's ownership.
drop policy if exists "Owner can view own messages" on public.messages;
create policy "Owner can view own messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owner can insert own messages" on public.messages;
create policy "Owner can insert own messages"
  on public.messages for insert
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owner can delete own messages" on public.messages;
create policy "Owner can delete own messages"
  on public.messages for delete
  using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );
