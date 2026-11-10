-- Checks supabase/migrations/20261110_android_v8.sql (and its rollback) against a scratch PostgreSQL database.
-- It stands in for Supabase with a minimal `auth` schema and the three roles, loads schema.sql, then the migration.
-- Run with tools/android/test-migration.sh. Never run this against a real project: it creates and drops objects.
\set ON_ERROR_STOP on
\set QUIET on
set client_min_messages = warning;

create schema auth;
create table auth.users (id uuid primary key, is_anonymous boolean not null default false, email_confirmed_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.role() returns text language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), current_user::text) $$;
create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
grant usage on schema public, auth to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;      -- as Supabase does
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;

\i supabase/schema.sql
\i supabase/migrations/20261110_android_v8.sql
\i supabase/migrations/20261110_android_v8.sql
\echo migration applied twice

create function pg_temp.as_user(u uuid, r text default 'authenticated') returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', coalesce(u::text, ''), false); perform set_config('request.jwt.claim.role', r, false); end $$;
create function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if ok is not true then raise exception 'FAILED: %', what; end if; end $$;
create function pg_temp.refused(q text, what text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then return; end;
  raise exception 'FAILED (should have been refused): %', what;
end $$;

insert into auth.users (id, email_confirmed_at) values
  ('aaaaaaaa-0000-4000-8000-000000000001', now()), ('bbbbbbbb-0000-4000-8000-000000000002', now()), ('cccccccc-0000-4000-8000-000000000003', now());
insert into public.schools (name, country, region, kind) values ('Test High', 'JM', 'Kingston', 'Secondary High');

-- ---------------------------------------------------------------- as students
set role authenticated;
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select public.ef_onboard(jsonb_build_object('first', 'Ana', 'last', 'Brown', 'age', 15, 'purpose', 'school', 'grade', 10, 'school', (select 1), 'findable', true)) is not null as ok \gset
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select public.ef_onboard(jsonb_build_object('first', 'Ben', 'last', 'Clarke', 'age', 16, 'purpose', 'school', 'grade', 10, 'school', (select 1), 'findable', true)) is not null as ok \gset
select pg_temp.refused($$select public.ef_profile_json('aaaaaaaa-0000-4000-8000-000000000001')$$, 'a helper function called directly');
reset role;
select username as ana from public.profiles where id = 'aaaaaaaa-0000-4000-8000-000000000001' \gset
select username as ben from public.profiles where id = 'bbbbbbbb-0000-4000-8000-000000000002' \gset
set role authenticated;

-- tables can't be touched directly (row-level security, no policies)
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect((select count(*) from public.app_prefs) = 0 and (select count(*) from public.blocks) = 0 and (select count(*) from public.reports) = 0, 'new tables show no rows to students');
select pg_temp.refused($$insert into public.app_prefs (user_id, data) values ('aaaaaaaa-0000-4000-8000-000000000001', '{}')$$, 'direct insert into app_prefs');
select pg_temp.refused($$insert into public.reports (kind, target, reason) values ('other', 'x', 'spam')$$, 'direct insert into reports');
select pg_temp.refused($$select * from ef_billing_private.entitlements$$, 'reading the billing schema');
select pg_temp.refused($$select public.zing_billing_apply('aaaaaaaa-0000-4000-8000-000000000001', repeat('a', 64), 'zing_plus', 'monthly', 'active', now() + interval '30 days', true)$$, 'a student granting themselves Plus');
select pg_temp.refused($$select public.zing_billing_rtdn_seen('m1', true)$$, 'a student marking notifications');

-- 1. app_prefs: revision-checked writes
select pg_temp.expect(public.ef_prefs_get() = '{"data": null, "rev": 0}'::jsonb, 'prefs start empty');
select pg_temp.expect((public.ef_prefs_put('{"v":1,"books":{}}', 0) ->> 'rev')::int = 1, 'first write is rev 1');
select pg_temp.expect((public.ef_prefs_put('{"v":1,"stale":true}', 0) ->> 'conflict')::boolean, 'a stale write is refused');
select pg_temp.expect((public.ef_prefs_get() -> 'data' ? 'stale') = false, 'the refused write changed nothing');
select pg_temp.expect((public.ef_prefs_put('{"v":1,"second":true}', 1) ->> 'rev')::int = 2, 'a write based on the current rev succeeds');
select pg_temp.refused($$select public.ef_prefs_put('[1,2]', 2)$$, 'prefs that are not an object');
select pg_temp.refused(format($$select public.ef_prefs_put(jsonb_build_object('x', repeat('y', 70000)), 2)$$), 'prefs over the size limit');
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.expect(public.ef_prefs_get() = '{"data": null, "rev": 0}'::jsonb, 'another student sees only their own prefs');

-- 2. XP with an operation ID counts once, and still obeys the caps
select pg_temp.expect((public.ef_add_xp2(50, '11111111-1111-4111-8111-111111111111') ->> 'xp_total')::int = 50, 'xp added');
select pg_temp.expect((public.ef_add_xp2(50, '11111111-1111-4111-8111-111111111111') ->> 'duplicate')::boolean, 'the same operation is a duplicate');
select pg_temp.expect((public.ef_me() ->> 'xp_total')::int = 50, 'xp counted once');
select pg_temp.expect((public.ef_add_xp2(9999, '22222222-2222-4222-8222-222222222222') ->> 'added')::int = 400, 'the 400-per-call cap still applies');
select pg_temp.as_user('cccccccc-0000-4000-8000-000000000003');
select pg_temp.refused($$select public.ef_add_xp2(10, '33333333-3333-4333-8333-333333333333')$$, 'xp without a profile');

-- 3. reporting and blocking
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select public.ef_follow(:'ben') is not null as ok \gset
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select public.ef_follow(:'ana') is not null as ok \gset
select pg_temp.expect((public.ef_profile(:'ana') ->> 'can_challenge')::boolean, 'classmates who follow each other can challenge');
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect((public.ef_block(:'ben') ->> 'ok')::boolean, 'block');
select pg_temp.expect(public.ef_blocked() = jsonb_build_array(:'ben'), 'my block list');
select pg_temp.expect((public.ef_me() ->> 'followers')::int = 0 and (public.ef_me() ->> 'following')::int = 0, 'blocking removes follows both ways');
select pg_temp.refused(format($$select public.ef_follow(%L)$$, :'ben'), 'following someone I blocked');
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.refused(format($$select public.ef_follow(%L)$$, :'ana'), 'following someone who blocked me');
select pg_temp.expect((public.ef_follow_many(array[:'ana']) ->> 'added')::int = 0, 'follow-many skips someone who blocked me');
select pg_temp.expect((public.ef_profile(:'ana') ->> 'can_challenge')::boolean = false, 'a blocked classmate cannot challenge');
select pg_temp.refused(format($$select public.ef_challenge(%L, 'ABCDEF', 'biology')$$, :'ana'), 'challenging someone who blocked me');
select pg_temp.expect(public.ef_blocked() = '[]'::jsonb, 'the blocked student cannot see who blocked them');
select pg_temp.expect((public.ef_report('profile', :'ana', 'bullying') ->> 'ok')::boolean, 'report');
select pg_temp.refused($$select public.ef_report('profile', 'x', 'Free text is not allowed!')$$, 'a report with free text');
select pg_temp.refused($$select public.ef_report('nonsense', 'x', 'spam')$$, 'a report of an unknown kind');
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select public.ef_unblock(:'ben') is not null as ok \gset
select public.ef_follow(:'ben') is not null as ok \gset

-- 4. Zing Plus
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'none', 'no entitlement to start with');
reset role; set role service_role; select pg_temp.as_user(null, 'service_role');
select pg_temp.expect(public.zing_billing_apply('aaaaaaaa-0000-4000-8000-000000000001', repeat('a', 64), 'zing_plus', 'monthly', 'active', now() + interval '30 days', true, 'GPA.1') ->> 'status' = 'applied', 'verified purchase applied');
select pg_temp.expect(public.zing_billing_apply('aaaaaaaa-0000-4000-8000-000000000001', repeat('a', 64), 'zing_plus', 'monthly', 'active', now() + interval '30 days', true, 'GPA.1') ->> 'status' = 'applied', 'applying it again is harmless');
select pg_temp.expect(public.zing_billing_apply('bbbbbbbb-0000-4000-8000-000000000002', repeat('a', 64), 'zing_plus', 'monthly', 'active', now() + interval '30 days', true) ->> 'status' = 'token_in_use', 'one purchase cannot serve two accounts');
select pg_temp.expect(public.zing_billing_rtdn_seen('msg-1') = false, 'notification not seen yet');
select public.zing_billing_rtdn_seen('msg-1', true) as ok \gset
select pg_temp.expect(public.zing_billing_rtdn_seen('msg-1'), 'notification remembered');
select pg_temp.refused($$select public.zing_billing_apply(null, 'not-a-hash', 'zing_plus', null, 'active', now(), true)$$, 'a malformed token hash');
reset role; set role authenticated; select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'active' and (public.ef_entitlement() ->> 'auto_renew')::boolean, 'the student now reads active');
select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'none', 'the other student still has none');
-- an upgrade replaces the purchase; then a notification (no user) for the OLD purchase expiring must not switch Plus off
reset role; set role service_role; select pg_temp.as_user(null, 'service_role');
select pg_temp.expect(public.zing_billing_apply(null, repeat('b', 64), 'zing_plus', 'annual', 'active', now() + interval '365 days', true, 'GPA.2', repeat('a', 64)) ->> 'status' = 'applied', 'replacement purchase found its owner through the old one');
select pg_temp.expect(public.zing_billing_apply(null, repeat('a', 64), 'zing_plus', 'monthly', 'expired', now() - interval '1 day', false) ->> 'status' = 'kept', 'the old purchase expiring keeps the new entitlement');
select pg_temp.expect(public.zing_billing_apply(null, repeat('f', 64), 'zing_plus', 'monthly', 'active', now() + interval '1 day', true) ->> 'status' = 'unknown_owner', 'a purchase nobody verified gives nobody Plus');
reset role; set role authenticated; select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'active', 'still active after the old purchase expired');
-- a refund: Google says revoked
reset role; set role service_role; select pg_temp.as_user(null, 'service_role');
select public.zing_billing_apply(null, repeat('b', 64), 'zing_plus', 'annual', 'revoked', now() + interval '300 days', false) as ok \gset
reset role; set role authenticated; select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'revoked', 'a refund switches Plus off at once');
-- a paid period that ran out reads as expired even before Google's notification arrives
reset role; set role service_role; select pg_temp.as_user(null, 'service_role');
select public.zing_billing_apply('bbbbbbbb-0000-4000-8000-000000000002', repeat('c', 64), 'zing_plus', 'monthly', 'active', now() - interval '3 hours', true) as ok \gset
reset role; set role authenticated; select pg_temp.as_user('bbbbbbbb-0000-4000-8000-000000000002');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'expired', 'an out-of-date "active" reads as expired');

-- 5. moving an account and deleting it
select pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001');
select public.ef_transfer_code() ->> 'code' as code \gset
select pg_temp.as_user('cccccccc-0000-4000-8000-000000000003');
select pg_temp.expect(public.ef_claim(:'code') ->> 'username' = :'ana', 'the transfer code moves the profile');
select pg_temp.expect((public.ef_prefs_get() ->> 'rev')::int = 2, 'and the appearance and notebook details');
select pg_temp.expect(public.ef_entitlement() ->> 'state' = 'revoked', 'and the subscription record');
select pg_temp.expect((public.ef_delete_me() ->> 'deleted')::boolean, 'delete');
select pg_temp.expect(public.ef_prefs_get() = '{"data": null, "rev": 0}'::jsonb and public.ef_entitlement() ->> 'state' = 'none' and public.ef_me() is null, 'nothing is left for that student');
reset role;
select pg_temp.expect((select count(*) from public.app_prefs where user_id = 'cccccccc-0000-4000-8000-000000000003') = 0, 'prefs row deleted');
select pg_temp.expect((select count(*) from public.xp_ops where user_id = 'cccccccc-0000-4000-8000-000000000003') = 0, 'xp operations deleted');
select pg_temp.expect((select count(*) from ef_billing_private.purchases where user_id is not null and token_hash in (repeat('a', 64), repeat('b', 64))) = 0, 'purchase records keep no link to the deleted student');
select pg_temp.expect((select count(*) from public.reports where reporter is null) = 0 and (select count(*) from public.reports) = 1, 'the other student''s report is untouched');
-- deleting the auth user removes everything by cascade too
delete from auth.users where id = 'bbbbbbbb-0000-4000-8000-000000000002';
select pg_temp.expect((select count(*) from public.profiles) = 0 and (select count(*) from ef_billing_private.entitlements) = 0 and (select count(*) from public.reports where reporter is not null) = 0, 'deleting the sign-in record cascades');
\echo migration behaviour: all checks passed

-- ---------------------------------------------------------------- rollback, then apply again
\i supabase/migrations/20261110_android_v8_rollback.sql
select pg_temp.expect(to_regclass('public.app_prefs') is null and to_regclass('public.blocks') is null and to_regclass('public.reports') is null and to_regclass('public.xp_ops') is null
  and not exists (select 1 from pg_namespace where nspname = 'ef_billing_private')
  and not exists (select 1 from pg_proc where proname in ('ef_prefs_get', 'ef_prefs_put', 'ef_add_xp2', 'ef_report', 'ef_block', 'ef_unblock', 'ef_blocked', 'ef_entitlement', 'zing_billing_apply', 'zing_billing_rtdn_seen')),
  'the rollback removed everything v8 added');
insert into auth.users (id, email_confirmed_at) values ('dddddddd-0000-4000-8000-000000000004', now()), ('eeeeeeee-0000-4000-8000-000000000005', now());
set role authenticated;
select pg_temp.as_user('dddddddd-0000-4000-8000-000000000004');
select public.ef_onboard('{"first":"Dee","last":"Evans","age":15}') ->> 'username' as dee \gset
select pg_temp.as_user('eeeeeeee-0000-4000-8000-000000000005');
select public.ef_onboard('{"first":"Eli","last":"Ford","age":15}') is not null as ok \gset
select pg_temp.expect(public.ef_follow(:'dee') is not null and (public.ef_follow_many(array[:'dee']) ->> 'added')::int = 0, 'the restored follow functions work without the blocks table');
select pg_temp.expect((public.ef_delete_me() ->> 'deleted')::boolean, 'the restored delete works without the new tables');
select pg_temp.refused($$select public.zing_billing_apply(null, repeat('a', 64), 'x', null, 'active', now(), true)$$, 'service function is gone');
reset role;
\i supabase/migrations/20261110_android_v8.sql
select pg_temp.expect(to_regclass('public.app_prefs') is not null and to_regclass('ef_billing_private.entitlements') is not null, 'the migration applies again after a rollback');
\echo rollback and re-apply: all checks passed
