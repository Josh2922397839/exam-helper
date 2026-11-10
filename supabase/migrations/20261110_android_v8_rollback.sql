-- Undoes 20261110_android_v8.sql. Run it in the Supabase SQL editor.
--
-- It puts back the five functions the migration changed (their bodies below are copied from schema.sql as it was
-- before v8) and removes everything the migration added. WARNING: this deletes the data in the new tables:
-- appearance and notebook details (app_prefs), reports, blocks, and Zing Plus entitlements and purchase records.
-- Export anything you need first. Students' decks, notes, progress and accounts are not touched.
-- Do not run this while people hold active Zing Plus subscriptions: the app would stop seeing them.

-- ---------------------------------------------------------------- the five changed functions, as they were
create or replace function public.ef_can_reach(u uuid, t uuid) returns boolean language sql stable
security definer set search_path = public
as $$
  select u <> t and (
    exists (select 1 from follows where follower = t and followee = u)
    or exists (select 1 from profiles a join profiles b on b.id = t where a.id = u and a.school_id is not null
               and a.school_id = b.school_id and ef_visible(b) and coalesce(ef_age(a) >= 13, false)))
$$;

create or replace function public.ef_follow(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); t uuid;
begin
  select id into t from profiles where lower(username) = lower(trim(p_username));
  if t is null then raise exception 'Nobody with that name yet.' using errcode = 'P0002'; end if;
  if t = u then raise exception 'That''s you!' using errcode = '22023'; end if;
  if (select count(*) from follows where follower = u) >= 200 then raise exception 'You can follow up to 200 friends.' using errcode = '54000'; end if;
  insert into follows (follower, followee) values (u, t) on conflict do nothing;
  return ef_friends_board();
end $$;

create or replace function public.ef_follow_many(p_usernames text[]) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); added integer := 0; t uuid; nm text;
begin
  if not exists (select 1 from profiles where id = u) then raise exception 'Please join first.' using errcode = '28000'; end if;
  foreach nm in array (coalesce(p_usernames, '{}'::text[]))[1:50] loop
    select id into t from profiles where lower(username) = lower(trim(nm));
    if t is not null and t <> u and (select count(*) from follows where follower = u) < 200 then
      insert into follows (follower, followee) values (u, t) on conflict do nothing;
      if found then added := added + 1; end if;
    end if;
  end loop;
  return jsonb_build_object('added', added);
end $$;

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
  delete from secrets where user_id = old; -- codes work once; make a new one any time
  return ef_me_json(u);
end $$;

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
  delete from profiles where id = u;
  return jsonb_build_object('deleted', true);
end $$;

-- ---------------------------------------------------------------- remove what v8 added
drop function if exists public.ef_prefs_get();
drop function if exists public.ef_prefs_put(jsonb, bigint);
drop function if exists public.ef_add_xp2(integer, uuid);
drop function if exists public.ef_report(text, text, text);
drop function if exists public.ef_block(text);
drop function if exists public.ef_unblock(text);
drop function if exists public.ef_blocked();
drop function if exists public.ef_entitlement();
drop function if exists public.zing_billing_apply(uuid, text, text, text, text, timestamptz, boolean, text, text);
drop function if exists public.zing_billing_rtdn_seen(text, boolean);
drop table if exists public.app_prefs;
drop table if exists public.xp_ops;
drop table if exists public.reports;
drop table if exists public.blocks;
drop schema if exists ef_billing_private cascade;

-- the same permissions schema.sql gives the restored functions
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('ef_can_reach', 'ef_follow', 'ef_follow_many', 'ef_claim', 'ef_delete_me') loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname <> 'ef_can_reach' then execute format('grant execute on function %s to anon, authenticated', f.sig); end if;
  end loop;
end $$;
