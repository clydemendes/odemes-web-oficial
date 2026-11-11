-- Odemes: bank sync via Plaid (invite only).
-- Run once in Supabase -> SQL Editor.
--
-- Three pieces:
--   1. bank_sync_invites  — the allowlist. Only emails in here see "Connect bank".
--   2. plaid_items        — one row per connected bank. Holds the Plaid access token,
--                           so the browser can never read it (RLS on, no policies;
--                           only /api/plaid with the service-role key touches it).
--   3. transactions.plaid_transaction_id — dedupe key so a sync never imports twice.

-- 1. Invites ---------------------------------------------------------------
create table if not exists public.bank_sync_invites (
  email      text primary key check (email = lower(email)),
  note       text,
  created_at timestamptz not null default now()
);
alter table public.bank_sync_invites enable row level security;
-- No policies: the browser can't list, add or remove invites.

-- 2. Connected banks -------------------------------------------------------
create table if not exists public.plaid_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  item_id          text not null unique,
  access_token     text not null,
  institution_id   text,
  institution_name text,
  cursor           text,
  status           text not null default 'ok',   -- ok | login_required | error
  error_code       text,
  last_synced_at   timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists plaid_items_user_id_idx on public.plaid_items(user_id);
alter table public.plaid_items enable row level security;
-- No policies on purpose: access_token must never reach the client.

-- 3. Dedupe key on transactions --------------------------------------------
alter table public.transactions add column if not exists plaid_transaction_id text;
alter table public.transactions add column if not exists plaid_item_id text;
-- A plain unique constraint (not a partial index) so PostgREST's on_conflict can use it.
-- Manually entered rows have NULL here, and NULLs never collide.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_plaid_transaction_id_key'
  ) then
    alter table public.transactions
      add constraint transactions_plaid_transaction_id_key unique (plaid_transaction_id);
  end if;
end $$;

-- Invite someone (lowercase email; they can be invited before they sign up):
--   insert into public.bank_sync_invites (email, note) values ('clydesemedo@gmail.com', 'me');
--
-- Revoke:
--   delete from public.bank_sync_invites where email = 'someone@example.com';
--   (Their bank stays connected until they disconnect it, but syncing stops.)
--
-- Who has connected what:
--   select u.email, p.institution_name, p.status, p.last_synced_at
--   from public.plaid_items p join auth.users u on u.id = p.user_id
--   order by p.created_at desc;
