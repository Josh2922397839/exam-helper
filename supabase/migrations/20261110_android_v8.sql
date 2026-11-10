-- Zing v8: what the Android app adds. NOT applied automatically: read docs/android/ARCHITECTURE.md (section 5),
-- try it on a test project, then run it in the Supabase SQL editor. Safe to run twice.
-- To undo it, run 20261110_android_v8_rollback.sql.
--
-- Same security model as schema.sql: every table has row-level security ON with NO policies, so clients can't read
-- or write tables directly; they call the checked ef_* functions. Functions only the Edge Functions may call are
-- named zing_* (so schema.sql's "grant every ef_* function" loop never touches them), check for the service role
-- themselves, and are revoked from anon and authenticated below.
--
-- Changes to things that already exist (everything else is new):
--   ef_can_reach, ef_follow, ef_follow_many   respect blocks; unchanged when nobody is blocked
--   ef_delete_me, ef_claim                    also cover the new tables

-- ---------------------------------------------------------------- 1. notebook details and appearance, across devices
-- One small JSON document per student: appearance settings, and notebook / note details the cloud save has no place
-- for (archive, order, pin, icon, subject, topic). Keys are existing deck and note IDs. `rev` goes up by one on every
-- write, and a write must say which rev it was based on, so two devices can never silently overwrite each other.
create table if not exists public.app_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  rev bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.app_prefs enable row level security;

create or replace function public.ef_prefs_get() returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce((select jsonb_build_object('data', p.data, 'rev', p.rev) from app_prefs p where p.user_id = auth.uid()),
                  jsonb_build_object('data', null, 'rev', 0))
$$;

create or replace function public.ef_prefs_put(p_data jsonb, p_base_rev bigint) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); cur app_prefs;
begin
  if jsonb_typeof(p_data) is distinct from 'object' or pg_column_size(p_data) > 64000 then
    raise exception 'Settings are too big.' using errcode = '54000';
  end if;
  -- one writer at a time per student, including the very first write (when there is no row to lock yet)
  perform pg_advisory_xact_lock(hashtextextended('app_prefs:' || u::text, 0));
  select * into cur from app_prefs where user_id = u;
  if coalesce(cur.rev, 0) <> coalesce(p_base_rev, 0) then
    -- someone wrote since this device last read: hand back what is there so it can merge and try again
    return jsonb_build_object('data', cur.data, 'rev', coalesce(cur.rev, 0), 'conflict', true);
  end if;
  insert into app_prefs (user_id, data, rev, updated_at) values (u, p_data, 1, now())
  on conflict (user_id) do update set data = excluded.data, rev = app_prefs.rev + 1, updated_at = now()
  returning * into cur;
  return jsonb_build_object('data', cur.data, 'rev', cur.rev, 'conflict', false);
end $$;

-- ---------------------------------------------------------------- 2. XP that can't be counted twice
-- ef_add_xp adds whatever it is sent, so a request that is retried after a lost answer counts twice. ef_add_xp2 takes
-- an operation ID: the first time it is seen the XP is added (by ef_add_xp, so every cap still applies); after that
-- the call changes nothing. IDs are forgotten after a week.
create table if not exists public.xp_ops (
  user_id uuid not null references auth.users (id) on delete cascade,
  op uuid not null,
  day date not null,
  primary key (user_id, op)
);
alter table public.xp_ops enable row level security;

create or replace function public.ef_add_xp2(p_n integer, p_op uuid) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); p profiles; fresh integer;
begin
  if p_op is null then raise exception 'Something went wrong. Try again.' using errcode = '22023'; end if;
  if not exists (select 1 from profiles where id = u) then raise exception 'Please join first.' using errcode = '28000'; end if;
  delete from xp_ops where user_id = u and day < ef_today() - 7;
  insert into xp_ops (user_id, op, day) values (u, p_op, ef_today()) on conflict do nothing;
  get diagnostics fresh = row_count;
  if fresh = 0 then
    select * into p from profiles where id = u;
    return jsonb_build_object('added', 0, 'xp_week', case when p.week = ef_week() then p.xp_week else 0 end,
      'xp_total', p.xp_total, 'league', p.league, 'duplicate', true);
  end if;
  return ef_add_xp(p_n) || jsonb_build_object('duplicate', false);
end $$;

-- ---------------------------------------------------------------- 3. reporting and blocking
-- Reports hold a reason code and what was reported (a username, a shared deck's ID, or a fingerprint of an AI
-- question). They never hold note text or an AI answer. Read them in the Table Editor: reports where handled_at is null.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('ai_answer', 'profile', 'deck', 'other')),
  target text not null check (char_length(target) between 1 and 80),
  reason text not null check (reason ~ '^[a-z_]{2,30}$'),
  created_at timestamptz not null default now(),
  handled_at timestamptz
);
create index if not exists reports_open on public.reports (created_at desc) where handled_at is null;
alter table public.reports enable row level security;

create table if not exists public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index if not exists blocks_blocked on public.blocks (blocked);
alter table public.blocks enable row level security;

create or replace function public.ef_report(p_kind text, p_target text, p_reason text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  if coalesce(p_kind, '') not in ('ai_answer', 'profile', 'deck', 'other') or coalesce(p_reason, '') !~ '^[a-z_]{2,30}$'
     or char_length(trim(coalesce(p_target, ''))) not between 1 and 80 then
    raise exception 'Something went wrong. Try again.' using errcode = '22023';
  end if;
  perform ef_rate('report', 20);
  insert into reports (reporter, kind, target, reason) values (u, p_kind, trim(p_target), p_reason);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ef_block(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); t uuid;
begin
  select id into t from profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if t is null then raise exception 'Nobody with that name yet.' using errcode = 'P0002'; end if;
  if t = u then raise exception 'That''s you!' using errcode = '22023'; end if;
  if (select count(*) from blocks where blocker = u) >= 500 then raise exception 'You can block up to 500 people.' using errcode = '54000'; end if;
  insert into blocks (blocker, blocked) values (u, t) on conflict do nothing;
  delete from follows where (follower = u and followee = t) or (follower = t and followee = u);
  delete from live_invites where (sender = t and recipient = u) or (sender = u and recipient = t);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ef_unblock(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
begin
  delete from blocks where blocker = ef_uid() and blocked = (select id from profiles where lower(username) = lower(trim(coalesce(p_username, ''))));
  return jsonb_build_object('ok', true);
end $$;

-- the usernames you have blocked (only you can see this list)
create or replace function public.ef_blocked() returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(p.username order by b.created_at desc), '[]'::jsonb)
  from blocks b join profiles p on p.id = b.blocked where b.blocker = auth.uid()
$$;

-- CHANGED (helper): nobody can challenge, or add to a group, someone who blocked them or whom they blocked
create or replace function public.ef_can_reach(u uuid, t uuid) returns boolean language sql stable
security definer set search_path = public
as $$
  select u <> t
    and not exists (select 1 from blocks where (blocker = t and blocked = u) or (blocker = u and blocked = t))
    and (
      exists (select 1 from follows where follower = t and followee = u)
      or exists (select 1 from profiles a join profiles b on b.id = t where a.id = u and a.school_id is not null
                 and a.school_id = b.school_id and ef_visible(b) and coalesce(ef_age(a) >= 13, false)))
$$;

-- CHANGED: you can't follow someone who blocked you (they would get a "new follower" notice), or someone you blocked.
-- The message is the same as for a name that doesn't exist, so a block can't be detected this way.
create or replace function public.ef_follow(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); t uuid;
begin
  select id into t from profiles where lower(username) = lower(trim(p_username));
  if t is null or exists (select 1 from blocks where (blocker = t and blocked = u) or (blocker = u and blocked = t)) then
    raise exception 'Nobody with that name yet.' using errcode = 'P0002';
  end if;
  if t = u then raise exception 'That''s you!' using errcode = '22023'; end if;
  if (select count(*) from follows where follower = u) >= 200 then raise exception 'You can follow up to 200 friends.' using errcode = '54000'; end if;
  insert into follows (follower, followee) values (u, t) on conflict do nothing;
  return ef_friends_board();
end $$;

-- CHANGED: the same rule when following several people at once
create or replace function public.ef_follow_many(p_usernames text[]) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); added integer := 0; t uuid; nm text;
begin
  if not exists (select 1 from profiles where id = u) then raise exception 'Please join first.' using errcode = '28000'; end if;
  foreach nm in array (coalesce(p_usernames, '{}'::text[]))[1:50] loop
    select id into t from profiles where lower(username) = lower(trim(nm));
    if t is not null and t <> u and (select count(*) from follows where follower = u) < 200
       and not exists (select 1 from blocks where (blocker = t and blocked = u) or (blocker = u and blocked = t)) then
      insert into follows (follower, followee) values (u, t) on conflict do nothing;
      if found then added := added + 1; end if;
    end if;
  end loop;
  return jsonb_build_object('added', added);
end $$;

-- ---------------------------------------------------------------- 4. Zing Plus (Google Play subscriptions)
-- The server is the only source of truth for who has Zing Plus. These tables live in a private schema that only
-- the Edge Functions (service key) can reach, like ef_ai_private. Purchase tokens are never stored: only their
-- SHA-256, which is enough to recognise a purchase when Google sends a notification about it.
create schema if not exists ef_billing_private;
revoke all on schema ef_billing_private from public, anon, authenticated;

create table if not exists ef_billing_private.purchases (
  token_hash text primary key check (token_hash ~ '^[0-9a-f]{64}$'),
  user_id uuid references auth.users (id) on delete set null,
  product_id text not null,
  base_plan_id text,
  state text not null check (state in ('none', 'pending', 'active', 'grace', 'on_hold', 'paused', 'canceled_active', 'expired', 'revoked', 'replaced')),
  expires_at timestamptz,
  auto_renew boolean not null default false,
  order_id text,
  -- the purchase this one replaced (an upgrade, downgrade or re-subscribe), by token hash
  linked_from text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists purchases_user on ef_billing_private.purchases (user_id, updated_at desc);

create table if not exists ef_billing_private.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  state text not null check (state in ('none', 'pending', 'active', 'grace', 'on_hold', 'paused', 'canceled_active', 'expired', 'revoked')),
  product_id text,
  base_plan_id text,
  expires_at timestamptz,
  auto_renew boolean not null default false,
  token_hash text,
  updated_at timestamptz not null default now()
);

-- Pub/Sub can deliver a notification more than once; each message ID is handled once
create table if not exists ef_billing_private.rtdn_events (
  message_id text primary key,
  received_at timestamptz not null default now()
);

alter table ef_billing_private.purchases enable row level security;
alter table ef_billing_private.entitlements enable row level security;
alter table ef_billing_private.rtdn_events enable row level security;
revoke all on all tables in schema ef_billing_private from public, anon, authenticated;

-- Records what Google says about one purchase and updates the student's entitlement. Called by the play-verify
-- (p_user_id = the signed-in student) and play-rtdn (p_user_id = null: the owner is looked up) Edge Functions.
-- Calling it again with the same facts changes nothing.
create or replace function public.zing_billing_apply(
  p_user_id uuid, p_token_hash text, p_product_id text, p_base_plan_id text, p_state text,
  p_expires_at timestamptz, p_auto_renew boolean, p_order_id text default null, p_linked_from text default null
) returns jsonb language plpgsql
security definer set search_path to ''
as $$
declare owner uuid; st text := coalesce(p_state, 'none');
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Permission denied' using errcode = '42501'; end if;
  if coalesce(p_token_hash, '') !~ '^[0-9a-f]{64}$' or coalesce(p_product_id, '') = ''
     or st not in ('none', 'pending', 'active', 'grace', 'on_hold', 'paused', 'canceled_active', 'expired', 'revoked') then
    raise exception 'Bad purchase' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('zing_purchase:' || p_token_hash, 0));

  -- whose purchase is it? The student who is verifying it, else whoever it (or the purchase it replaced) belongs to
  select user_id into owner from ef_billing_private.purchases where token_hash = p_token_hash;
  if owner is null and p_linked_from is not null then
    select user_id into owner from ef_billing_private.purchases where token_hash = p_linked_from;
  end if;
  if p_user_id is not null then
    -- one purchase can't give Plus to two accounts
    if owner is not null and owner <> p_user_id then return jsonb_build_object('status', 'token_in_use'); end if;
    owner := p_user_id;
  end if;

  insert into ef_billing_private.purchases as pu (token_hash, user_id, product_id, base_plan_id, state, expires_at, auto_renew, order_id, linked_from)
  values (p_token_hash, owner, p_product_id, p_base_plan_id, st, p_expires_at, coalesce(p_auto_renew, false), p_order_id, p_linked_from)
  on conflict (token_hash) do update set user_id = coalesce(pu.user_id, excluded.user_id), product_id = excluded.product_id,
    base_plan_id = excluded.base_plan_id, state = excluded.state, expires_at = excluded.expires_at, auto_renew = excluded.auto_renew,
    order_id = coalesce(excluded.order_id, pu.order_id), linked_from = coalesce(excluded.linked_from, pu.linked_from), updated_at = now();
  if p_linked_from is not null then
    update ef_billing_private.purchases set state = 'replaced', updated_at = now() where token_hash = p_linked_from and state <> 'replaced';
  end if;
  if owner is null then return jsonb_build_object('status', 'unknown_owner'); end if; -- a notification for a purchase nobody has verified yet

  -- the entitlement follows this purchase, unless the student's entitlement already rests on a different, newer
  -- purchase that still gives access (an old purchase expiring must not switch off a new one)
  if exists (select 1 from ef_billing_private.entitlements e
             where e.user_id = owner and e.token_hash is distinct from p_token_hash and e.token_hash is distinct from p_linked_from
               and e.state in ('active', 'grace', 'canceled_active') and (e.expires_at is null or e.expires_at > now())
               and st not in ('active', 'grace', 'canceled_active')) then
    return jsonb_build_object('status', 'kept', 'user_id', owner);
  end if;
  insert into ef_billing_private.entitlements as e (user_id, state, product_id, base_plan_id, expires_at, auto_renew, token_hash)
  values (owner, st, p_product_id, p_base_plan_id, p_expires_at, coalesce(p_auto_renew, false), p_token_hash)
  on conflict (user_id) do update set state = excluded.state, product_id = excluded.product_id, base_plan_id = excluded.base_plan_id,
    expires_at = excluded.expires_at, auto_renew = excluded.auto_renew, token_hash = excluded.token_hash, updated_at = now();
  return jsonb_build_object('status', 'applied', 'user_id', owner, 'state', st,
    'expires_at', case when p_expires_at is null then null else floor(extract(epoch from p_expires_at) * 1000) end,
    'product_id', p_product_id, 'auto_renew', coalesce(p_auto_renew, false));
end $$;

-- p_mark = false: has this notification been handled? p_mark = true: remember that it has.
create or replace function public.zing_billing_rtdn_seen(p_message_id text, p_mark boolean default false) returns boolean language plpgsql
security definer set search_path to ''
as $$
begin
  if auth.role() is distinct from 'service_role' then raise exception 'Permission denied' using errcode = '42501'; end if;
  if coalesce(p_message_id, '') = '' or char_length(p_message_id) > 200 then return false; end if;
  if coalesce(p_mark, false) then
    insert into ef_billing_private.rtdn_events (message_id) values (p_message_id) on conflict do nothing;
    delete from ef_billing_private.rtdn_events where received_at < now() - interval '30 days';
    return true;
  end if;
  return exists (select 1 from ef_billing_private.rtdn_events where message_id = p_message_id);
end $$;

-- What the app asks: "do I have Zing Plus?" A paid period that has run out reads as expired even if Google's
-- notification hasn't arrived yet. expires_at is in milliseconds since 1970.
create or replace function public.ef_entitlement() returns jsonb language sql stable
security definer set search_path to ''
as $$
  select coalesce((
    select jsonb_build_object(
      'state', case when e.state in ('active', 'grace', 'canceled_active') and e.expires_at is not null and e.expires_at < now() - interval '1 hour'
                    then 'expired' else e.state end,
      'product_id', e.product_id, 'auto_renew', e.auto_renew,
      'expires_at', case when e.expires_at is null then null else floor(extract(epoch from e.expires_at) * 1000) end)
    from ef_billing_private.entitlements e where e.user_id = auth.uid()),
    jsonb_build_object('state', 'none', 'product_id', null, 'auto_renew', false, 'expires_at', null))
$$;

-- ---------------------------------------------------------------- 5. moving devices and deleting, updated for the new tables
-- CHANGED: the transfer code also moves the new rows. (This is the v7 function plus the lines marked v8.)
create or replace function public.ef_claim(p_code text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); old uuid;
begin
  perform ef_rate('claim', 10);
  select user_id into old from secrets where code_hash = encode(sha256(convert_to(raw, 'UTF8')), 'hex');
  -- return (not raise) so the attempt still counts toward the daily limit; an exception would roll it back
  if old is null then return jsonb_build_object('error', 'That code didn''t work. Check it and try again.'); end if;
  if old = u then return ef_me_json(u); end if;
  if exists (select 1 from profiles where id = u) then
    raise exception 'This device already has an account. Sign out first.' using errcode = '23505';
  end if;
  update profiles set id = u where id = old;
  update profiles set referred_by = u where referred_by = old;
  update saves set user_id = u where user_id = old;
  update follows set follower = u where follower = old;
  update follows set followee = u where followee = old;
  update shared_sets set owner = u where owner = old;
  update set_saves set user_id = u where user_id = old;
  update xp_days set user_id = u where user_id = old;
  update live_invites set sender = u where sender = old;
  update live_invites set recipient = u where recipient = old;
  update study_groups set owner = u where owner = old;
  update group_members set user_id = u where user_id = old;
  update group_messages set sender = u where sender = old;
  update deck_xp set user_id = u where user_id = old;
  -- v8
  delete from app_prefs where user_id = u;
  update app_prefs set user_id = u where user_id = old;
  delete from xp_ops where user_id = u;
  update xp_ops set user_id = u where user_id = old;
  delete from blocks where (blocker = old and blocked = u) or (blocker = u and blocked = old);
  update blocks set blocker = u where blocker = old and not exists (select 1 from blocks b where b.blocker = u and b.blocked = blocks.blocked);
  update blocks set blocked = u where blocked = old and not exists (select 1 from blocks b where b.blocked = u and b.blocker = blocks.blocker);
  delete from blocks where blocker = old or blocked = old;
  update reports set reporter = u where reporter = old;
  delete from ef_billing_private.entitlements where user_id = u;
  update ef_billing_private.entitlements set user_id = u where user_id = old;
  update ef_billing_private.purchases set user_id = u where user_id = old;
  delete from secrets where user_id = old; -- codes work once; make a new one any time
  return ef_me_json(u);
end $$;

-- CHANGED: deleting an account also removes the new rows. The entitlement is deleted; purchase records keep only
-- the token's hash and lose their link to the student (they are needed to answer Google's refund and chargeback
-- notifications). Reports the student made stay, without their name on them. (v7 function plus the lines marked v8.)
create or replace function public.ef_delete_me() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); g uuid;
begin
  for g in select group_id from group_members where user_id = u loop
    delete from group_members where group_id = g and user_id = u;
    if not exists (select 1 from group_members where group_id = g) then delete from study_groups where id = g; end if;
  end loop;
  delete from group_messages where sender = u;
  update study_groups set owner = null where owner = u;
  delete from live_invites where sender = u or recipient = u;
  delete from xp_days where user_id = u;
  delete from deck_xp where user_id = u;
  update profiles set referred_by = null where referred_by = u;
  delete from follows where follower = u or followee = u;
  delete from shared_sets where owner = u;
  delete from set_saves where user_id = u;
  delete from saves where user_id = u;
  delete from secrets where user_id = u;
  -- v8
  delete from app_prefs where user_id = u;
  delete from xp_ops where user_id = u;
  delete from blocks where blocker = u or blocked = u;
  update reports set reporter = null where reporter = u;
  delete from ef_billing_private.entitlements where user_id = u;
  update ef_billing_private.purchases set user_id = null where user_id = u;
  delete from profiles where id = u;
  return jsonb_build_object('deleted', true);
end $$;

-- ---------------------------------------------------------------- permissions
-- New functions the apps may call:
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('ef_prefs_get', 'ef_prefs_put', 'ef_add_xp2', 'ef_report', 'ef_block', 'ef_unblock',
                                                       'ef_blocked', 'ef_entitlement', 'ef_follow', 'ef_follow_many', 'ef_claim', 'ef_delete_me') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to anon, authenticated', f.sig);
  end loop;
  -- helpers and service-only functions: never callable by the apps
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('ef_can_reach', 'zing_billing_apply', 'zing_billing_rtdn_seen') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant usage on schema ef_billing_private to service_role;
    grant execute on function public.zing_billing_apply(uuid, text, text, text, text, timestamptz, boolean, text, text) to service_role;
    grant execute on function public.zing_billing_rtdn_seen(text, boolean) to service_role;
  end if;
end $$;
