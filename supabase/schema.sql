-- Zing cloud: schools, weekly leagues, friends, cloud saves, each school's shared study sets, onboarding,
-- Live challenges and study groups.
-- Run this once in the Supabase SQL editor (safe to run again).
--
-- Security model: every table has row-level security turned ON with NO policies, so the browser can't read or
-- write tables directly. All access goes through the ef_* functions below, which check who is calling
-- (auth.uid()), validate input and cap XP. The public anon key in the website can only call these functions.

-- ---------------------------------------------------------------- tables
create table if not exists public.schools (
  id bigint generated always as identity primary key,
  name text not null check (char_length(name) between 2 and 120),
  country text not null default 'JM' check (country ~ '^[A-Z]{2}$'),
  region text check (region is null or char_length(region) <= 80),
  kind text check (kind is null or char_length(kind) <= 40),
  osm_ref text unique check (osm_ref is null or osm_ref ~ '^(node|way|relation)/[0-9]+$'),
  lat double precision,
  lon double precision,
  added_by uuid,
  created_at timestamptz not null default now()
);
-- v3: every Jamaican school comes pre-loaded from the Ministry of Education's directory (moey_code), and
-- schools can show their real crest. Logos may only point at Wikimedia or at an image shipped with the site.
alter table public.schools add column if not exists moey_code text unique check (moey_code is null or moey_code ~ '^[0-9]{5}$');
alter table public.schools add column if not exists logo text check (logo is null or logo ~ '^https://(upload|thumb)[.]wikimedia[.]org/[A-Za-z0-9/._%()~,!*+-]+$' or logo ~ '^assets/img/schools/[a-z0-9-]+[.](webp|png|jpg|svg)$');
alter table public.schools add column if not exists logo_kind text check (logo_kind is null or logo_kind in ('logo', 'photo'));
-- names only need to be unique within a parish (there are many Mount Pleasant Primary Schools)
drop index if exists public.schools_name_country;
create unique index if not exists schools_name_country_region on public.schools (lower(name), country, lower(coalesce(region, '')));

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  school_id bigint references public.schools (id) on delete set null,
  grade smallint check (grade is null or grade between 6 and 13),
  avatar text check (avatar is null or avatar ~ '^[a-z]{2,16}$'),
  league smallint not null default 1 check (league between 1 and 9),
  xp_total integer not null default 0,
  xp_week integer not null default 0,
  week date not null,
  xp_day integer not null default 0,
  day date not null,
  last_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles add column if not exists avatar text;
create unique index if not exists profiles_username on public.profiles (lower(username));
create index if not exists profiles_league on public.profiles (league, week, xp_week desc);
create index if not exists profiles_school on public.profiles (school_id, week, xp_week desc);

create table if not exists public.secrets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower uuid not null references auth.users (id) on delete cascade,
  followee uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);

create table if not exists public.shared_sets (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references auth.users (id) on delete cascade,
  school_id bigint references public.schools (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#ff6a2b' check (color ~ '^#[0-9a-fA-F]{6}$'),
  cards jsonb not null,
  card_count integer not null,
  saves integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_sets_school on public.shared_sets (school_id, saves desc, created_at desc);

create table if not exists public.set_saves (
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id uuid not null references public.shared_sets (id) on delete cascade,
  primary key (user_id, set_id)
);

create table if not exists public.rate (
  user_id uuid not null,
  kind text not null,
  day date not null,
  n integer not null default 0,
  primary key (user_id, kind, day)
);

create table if not exists public.ef_meta (key text primary key, value text);

alter table public.schools enable row level security;
alter table public.profiles enable row level security;
alter table public.secrets enable row level security;
alter table public.saves enable row level security;
alter table public.follows enable row level security;
alter table public.shared_sets enable row level security;
alter table public.set_saves enable row level security;
alter table public.rate enable row level security;
alter table public.ef_meta enable row level security;

-- ---------------------------------------------------------------- helpers (not callable from the website)
-- Weeks run Monday 00:00 to Sunday 23:59, Jamaica time
create or replace function public.ef_today() returns date language sql stable
as $$ select (now() at time zone 'America/Jamaica')::date $$;
create or replace function public.ef_week() returns date language sql stable
as $$ select date_trunc('week', now() at time zone 'America/Jamaica')::date $$;

create or replace function public.ef_uid() returns uuid language plpgsql stable
as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'Please join first.' using errcode = '28000'; end if;
  return u;
end $$;

-- simple per-day limits (adding schools, publishing sets, trying transfer codes)
create or replace function public.ef_rate(p_kind text, p_max integer) returns void language plpgsql
security definer set search_path = public
as $$
declare used integer;
begin
  insert into rate (user_id, kind, day, n) values (ef_uid(), p_kind, ef_today(), 1)
  on conflict (user_id, kind, day) do update set n = rate.n + 1
  returning n into used;
  if used > p_max then raise exception 'Daily limit reached. Try again tomorrow.' using errcode = '54000'; end if;
end $$;

-- groups the Ministry's school types for the school picker
create or replace function public.ef_kind_group(p_kind text) returns text language sql immutable
as $$
  select case when p_kind is null then 'other'
              when p_kind ~* '(university|college|tertiary|polytechnic|post secondary)' then 'tertiary'
              when p_kind ~* '(high|secondary)' and p_kind !~* 'junior' then 'high'
              when p_kind ~* 'special' then 'special'
              else 'primary' end
$$;

-- what the website gets to know about a school
create or replace function public.ef_school_json(s public.schools) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('id', s.id, 'name', s.name, 'region', s.region, 'country', s.country, 'kind', s.kind,
    'group', ef_kind_group(s.kind), 'logo', s.logo, 'logo_kind', s.logo_kind)
$$;

create or replace function public.ef_check_name(p_name text) returns text language plpgsql immutable
as $$
declare n text := trim(coalesce(p_name, ''));
begin
  if n !~ '^[A-Za-z0-9_]{3,20}$' then
    raise exception 'Names are 3–20 letters, numbers or _' using errcode = '22023';
  end if;
  if lower(n) ~ '(fuck|shit|bitch|cunt|dick|pussy|nigg|fag|whore|slut|rape|porn|sex|bomboclaat|bumbo|raas|pussyclaat|kill|admin|examforge|moderator)' then
    raise exception 'Please choose a different name.' using errcode = '22023';
  end if;
  return n;
end $$;

-- Ends finished weeks: top 20% of active players in each league move up, bottom 20% (in leagues of 5+) move down,
-- players who earned no XP drop one league. Runs automatically the first time anyone uses the site in a new week,
-- so no scheduled job is needed.
create or replace function public.ef_close_weeks() returns void language plpgsql
security definer set search_path = public
as $$
declare cur date := ef_week(); closed date; wk date;
begin
  select value::date into closed from ef_meta where key = 'closed_week';
  if closed is not null and closed >= cur - 7 and not exists (select 1 from profiles where week < cur) then return; end if;
  perform pg_advisory_xact_lock(7240001);
  for wk in select distinct week from profiles where week < cur order by week loop
    with ranked as (
      select id, league, xp_week,
             row_number() over (partition by league order by xp_week desc, updated_at) as rk,
             count(*) over (partition by league) as n
      from profiles where week = wk and xp_week > 0
    )
    update profiles p set
      league = least(9, greatest(1, p.league
        + case when r.rk <= greatest(1, ceil(r.n * 0.2)) and r.xp_week >= 30 then 1
               when r.n >= 5 and r.rk > r.n - floor(r.n * 0.2) then -1
               else 0 end)),
      last_result = jsonb_build_object('week', wk, 'from', r.league, 'rank', r.rk, 'of', r.n, 'xp', r.xp_week)
    from ranked r where p.id = r.id;
    update profiles set league = greatest(1, league - 1),
      last_result = jsonb_build_object('week', wk, 'from', league, 'rank', null, 'of', null, 'xp', 0)
      where week = wk and xp_week = 0 and league > 1;
    update profiles set xp_week = 0, week = cur where week = wk;
  end loop;
  insert into ef_meta (key, value) values ('closed_week', (cur - 7)::text)
  on conflict (key) do update set value = excluded.value;
end $$;

-- ---------------------------------------------------------------- profile


create or replace function public.ef_username_free(p_username text) returns jsonb language sql stable
security definer set search_path = public
as $$
  select to_jsonb(not exists (select 1 from profiles where lower(username) = lower(trim(p_username)) and id is distinct from auth.uid()))
$$;

drop function if exists public.ef_save_profile(text, bigint, integer);


-- ---------------------------------------------------------------- leaderboards
create or replace function public.ef_league_board() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := auth.uid(); me profiles; w date := ef_week(); n integer; my_rank integer; rows jsonb;
begin
  perform ef_close_weeks();
  select * into me from profiles where id = u;
  if not found then return null; end if;
  select count(*) into n from profiles where league = me.league and week = w and (xp_week > 0 or id = u);
  select rk into my_rank from (
    select id, row_number() over (order by xp_week desc, updated_at) rk
    from profiles where league = me.league and week = w and (xp_week > 0 or id = u)) t where id = u;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by p.xp_week desc, p.updated_at) as rank, p.username, p.avatar, s.name as school, p.xp_week as xp, p.id = u as me,
           exists (select 1 from follows f where f.follower = u and f.followee = p.id) as friend
    from profiles p left join schools s on s.id = p.school_id
    where p.league = me.league and p.week = w and (p.xp_week > 0 or p.id = u)
    order by p.xp_week desc, p.updated_at limit 50) x;
  return jsonb_build_object('league', me.league, 'rows', rows, 'total', n, 'my_rank', my_rank,
    'promote', case when me.league < 9 then greatest(1, ceil(n * 0.2)) else 0 end,
    'demote', case when me.league > 1 and n >= 5 then floor(n * 0.2) else 0 end,
    'week_ends', ((w + 7)::timestamp at time zone 'America/Jamaica'), 'last_result', me.last_result);
end $$;

drop function if exists public.ef_school_board(bigint);

create or replace function public.ef_schools_board(p_country text default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare w date := ef_week(); rows jsonb;
begin
  perform ef_close_weeks();
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by sum(case when p.week = w then p.xp_week else 0 end) desc, count(*) desc, s.name) as rank,
           s.id, s.name, s.region, s.country, s.kind, s.logo, s.logo_kind, count(*) as members, sum(case when p.week = w then p.xp_week else 0 end) as xp
    from schools s join profiles p on p.school_id = s.id
    where p_country is null or s.country = p_country
    group by s.id
    order by xp desc, members desc, s.name limit 50) x;
  return jsonb_build_object('rows', rows, 'week_ends', ((w + 7)::timestamp at time zone 'America/Jamaica'));
end $$;

create or replace function public.ef_friends_board() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); w date := ef_week(); rows jsonb;
begin
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by (case when p.week = w then p.xp_week else 0 end) desc, p.xp_total desc) as rank,
           p.username, p.avatar, s.name as school, p.league, case when p.week = w then p.xp_week else 0 end as xp, p.id = u as me, p.id <> u as friend
    from profiles p left join schools s on s.id = p.school_id
    where p.id = u or p.id in (select followee from follows where follower = u)
    order by (case when p.week = w then p.xp_week else 0 end) desc, p.xp_total desc limit 100) x;
  return jsonb_build_object('rows', rows);
end $$;


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

create or replace function public.ef_unfollow(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  delete from follows where follower = u and followee = (select id from profiles where lower(username) = lower(trim(p_username)));
  return ef_friends_board();
end $$;

-- ---------------------------------------------------------------- schools
-- search ignores punctuation and spaces, so st georges, St. George's and stgeorges all find the same school
create or replace function public.ef_search_schools(p_q text, p_country text default null) returns jsonb language sql stable
security definer set search_path = public
as $$
  with q as (select regexp_replace(lower(trim(coalesce(p_q, ''))), '[^a-z0-9]+', '', 'g') as k)
  select coalesce(jsonb_agg(x.j order by x.rk), '[]'::jsonb) from (
    select ef_school_json(s) || jsonb_build_object('members', (select count(*) from profiles p where p.school_id = s.id)) as j,
           row_number() over (order by (strpos(regexp_replace(lower(s.name), '[^a-z0-9]+', '', 'g'), q.k) = 1) desc,
             (select count(*) from profiles p where p.school_id = s.id) desc,
             (ef_kind_group(s.kind) = 'high') desc, (s.logo is not null) desc, s.name) as rk
    from schools s, q
    where char_length(q.k) >= 2
      and strpos(regexp_replace(lower(s.name), '[^a-z0-9]+', '', 'g'), q.k) > 0
      and (p_country is null or s.country = p_country)
    order by rk limit 20) x
$$;

-- browse without typing: by parish and by type (high school, primary and prep, college and university)
create or replace function public.ef_browse_schools(p_country text default 'JM', p_region text default null, p_group text default null, p_offset integer default 0)
returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('rows', coalesce(jsonb_agg(x.j order by x.rk), '[]'::jsonb),
    'total', (select count(*) from schools s where s.country = upper(coalesce(p_country, 'JM'))
              and (p_region is null or s.region = p_region) and (p_group is null or ef_kind_group(s.kind) = p_group)))
  from (
    select ef_school_json(s) || jsonb_build_object('members', m.n) as j,
           row_number() over (order by m.n desc, (s.logo is not null) desc, s.name) as rk
    from schools s
    cross join lateral (select count(*) as n from profiles p where p.school_id = s.id) m
    where s.country = upper(coalesce(p_country, 'JM'))
      and (p_region is null or s.region = p_region)
      and (p_group is null or ef_kind_group(s.kind) = p_group)
    order by m.n desc, (s.logo is not null) desc, s.name
    limit 60 offset least(greatest(coalesce(p_offset, 0), 0), 5000)) x
$$;

create or replace function public.ef_add_school(p_name text, p_country text, p_region text default null, p_kind text default null,
  p_osm text default null, p_lat double precision default null, p_lon double precision default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); nm text := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g'); c text := upper(trim(coalesce(p_country, 'JM'))); s schools;
begin
  if char_length(nm) < 2 or char_length(nm) > 120 then raise exception 'Type the school''s full name.' using errcode = '22023'; end if;
  if c !~ '^[A-Z]{2}$' then raise exception 'Unknown country.' using errcode = '22023'; end if;
  if p_osm is not null and p_osm !~ '^(node|way|relation)/[0-9]+$' then p_osm := null; end if;
  select * into s from schools where (p_osm is not null and osm_ref = p_osm)
    or (lower(name) = lower(nm) and country = c and (p_region is null or region is null or lower(region) = lower(trim(p_region))))
    order by (p_osm is not null and osm_ref = p_osm) desc limit 1;
  if not found then
    perform ef_rate('add_school', 10);
    insert into schools (name, country, region, kind, osm_ref, lat, lon, added_by)
    values (nm, c, nullif(left(trim(coalesce(p_region, '')), 80), ''), nullif(left(trim(coalesce(p_kind, '')), 40), ''), p_osm, p_lat, p_lon, u)
    returning * into s;
  end if;
  return ef_school_json(s);
end $$;

-- ---------------------------------------------------------------- cloud save + moving to a new device
create or replace function public.ef_save_put(p_data jsonb) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  if jsonb_typeof(p_data) <> 'object' or pg_column_size(p_data) > 600000 then raise exception 'Save is too big.' using errcode = '54000'; end if;
  insert into saves (user_id, data, updated_at) values (u, p_data, now())
  on conflict (user_id) do update set data = excluded.data, updated_at = now();
  return jsonb_build_object('saved_at', now());
end $$;

create or replace function public.ef_save_get() returns jsonb language sql stable
security definer set search_path = public
as $$ select data from saves where user_id = auth.uid() $$;

create or replace function public.ef_transfer_code() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); raw text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)); code text;
begin
  if not exists (select 1 from profiles where id = u) then raise exception 'Please join first.' using errcode = '28000'; end if;
  code := substr(raw, 1, 4) || '-' || substr(raw, 5, 4) || '-' || substr(raw, 9, 4);
  insert into secrets (user_id, code_hash) values (u, encode(sha256(convert_to(raw, 'UTF8')), 'hex'))
  on conflict (user_id) do update set code_hash = excluded.code_hash, created_at = now();
  return jsonb_build_object('code', code);
end $$;



-- ---------------------------------------------------------------- each school's shared study sets
create or replace function public.ef_set_publish(p_name text, p_color text, p_cards jsonb) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); sch bigint; nm text := left(trim(coalesce(p_name, '')), 60); clean jsonb; existing uuid;
begin
  select school_id into sch from profiles where id = u;
  if sch is null then raise exception 'Pick your school first.' using errcode = '22023'; end if;
  if nm = '' then raise exception 'Give the set a name.' using errcode = '22023'; end if;
  if jsonb_typeof(p_cards) <> 'array' or jsonb_array_length(p_cards) < 2 or jsonb_array_length(p_cards) > 400 then
    raise exception 'A set needs 2 to 400 cards.' using errcode = '22023';
  end if;
  if exists (select 1 from jsonb_array_elements(p_cards) e
             where jsonb_typeof(e) <> 'array' or jsonb_array_length(e) < 2
               or jsonb_typeof(e -> 0) <> 'string' or jsonb_typeof(e -> 1) <> 'string'
               or char_length(e ->> 0) not between 1 and 300 or char_length(e ->> 1) not between 1 and 300) then
    raise exception 'Some cards are empty or too long.' using errcode = '22023';
  end if;
  select jsonb_agg(jsonb_build_array(e ->> 0, e ->> 1)) into clean from jsonb_array_elements(p_cards) e;
  select id into existing from shared_sets where owner = u and school_id = sch and lower(name) = lower(nm);
  if existing is not null then
    update shared_sets set cards = clean, card_count = jsonb_array_length(clean),
      color = case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else color end, updated_at = now()
    where id = existing;
    return jsonb_build_object('id', existing, 'updated', true);
  end if;
  perform ef_rate('publish', 20);
  insert into shared_sets (owner, school_id, name, color, cards, card_count)
  values (u, sch, nm, case when p_color ~ '^#[0-9a-fA-F]{6}$' then p_color else '#ff6a2b' end, clean, jsonb_array_length(clean))
  returning id into existing;
  return jsonb_build_object('id', existing, 'updated', false);
end $$;

create or replace function public.ef_school_sets(p_school bigint) returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select ss.id, ss.name, ss.color, ss.card_count, ss.saves, p.username as author, ss.created_at, ss.owner = auth.uid() as mine
    from shared_sets ss left join profiles p on p.id = ss.owner
    where ss.school_id = p_school
    order by ss.saves desc, ss.created_at desc limit 60) x
$$;

create or replace function public.ef_set_get(p_id uuid) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('id', ss.id, 'name', ss.name, 'color', ss.color, 'cards', ss.cards, 'saves', ss.saves,
    'author', p.username, 'school', s.name, 'mine', ss.owner = auth.uid())
  from shared_sets ss left join profiles p on p.id = ss.owner left join schools s on s.id = ss.school_id where ss.id = p_id
$$;

create or replace function public.ef_set_saved(p_id uuid) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); added integer;
begin
  insert into set_saves (user_id, set_id) values (u, p_id) on conflict do nothing;
  get diagnostics added = row_count;
  if added > 0 then update shared_sets set saves = saves + 1 where id = p_id and owner <> u; end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ef_set_delete(p_id uuid) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  delete from shared_sets where id = p_id and owner = u;
  return jsonb_build_object('deleted', found);
end $$;

-- ---------------------------------------------------------------- v6 (Zing): onboarding, classmates, Live challenges, month boards, study groups
-- Onboarding details are private. Other students only ever see a username, avatar, grade and school, plus a
-- first name and last initial when the student is 13 or older AND has "friend finding" switched on.
alter table public.profiles add column if not exists first_name text check (first_name is null or char_length(first_name) between 1 and 30);
alter table public.profiles add column if not exists last_name text check (last_name is null or char_length(last_name) between 1 and 30);
alter table public.profiles add column if not exists birth_year smallint check (birth_year is null or birth_year between 1900 and 2100);
alter table public.profiles add column if not exists purpose text check (purpose is null or purpose in ('school', 'university', 'work', 'other'));
alter table public.profiles add column if not exists findable boolean not null default true;
alter table public.profiles add column if not exists reminders boolean not null default false;
alter table public.profiles add column if not exists onboarded boolean not null default false;
alter table public.profiles add column if not exists referred_by uuid references auth.users (id) on delete set null;
alter table public.profiles add column if not exists last_seen timestamptz;
alter table public.profiles add column if not exists inbox_seen timestamptz;
create index if not exists profiles_seen on public.profiles (last_seen desc);
create index if not exists follows_followee on public.follows (followee, created_at desc);

-- XP per day, so school boards can show this month as well as this week and all time
create table if not exists public.xp_days (
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  xp integer not null default 0,
  primary key (user_id, day)
);

-- "Challenge a friend": a Live game invite that shows up on their Social page and in their bell for 20 minutes
create table if not exists public.live_invites (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  code text not null check (code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  subject text not null check (subject ~ '^[a-z0-9-]{2,40}$'),
  topic text check (topic is null or char_length(topic) <= 80),
  status text not null default 'sent' check (status in ('sent', 'joined', 'declined')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '20 minutes',
  check (sender <> recipient)
);
create index if not exists live_invites_to on public.live_invites (recipient, expires_at desc);

-- Study groups. Messages are never free text: an emoji, a ready-made phrase, a card from a Zing deck,
-- a Live game code, or a note the server writes ("Ana joined"). So there's nothing to moderate.
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  color text not null default '#0b8a5e' check (color ~ '^#[0-9a-fA-F]{6}$'),
  owner uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now()
);
create table if not exists public.group_members (
  group_id uuid not null references public.study_groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_read bigint not null default 0,
  primary key (group_id, user_id)
);
create index if not exists group_members_user on public.group_members (user_id);
create table if not exists public.group_messages (
  id bigint generated always as identity primary key,
  group_id uuid not null references public.study_groups (id) on delete cascade,
  sender uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('emoji', 'phrase', 'card', 'live', 'system')),
  body jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group on public.group_messages (group_id, id desc);

alter table public.xp_days enable row level security;
alter table public.live_invites enable row level security;
alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_messages enable row level security;

-- ---------------------------------------------------------------- v6 helpers (not callable from the website)
create or replace function public.ef_age(p public.profiles) returns integer language sql stable
as $$ select case when p.birth_year is null then null else extract(year from ef_today())::int - p.birth_year end $$;

-- 13+ and friend finding on: the only students others can discover, see the real first name of, or add to groups
create or replace function public.ef_visible(p public.profiles) returns boolean language sql stable
as $$ select coalesce(p.findable, false) and coalesce(ef_age(p) >= 13, false) $$;

create or replace function public.ef_display(p public.profiles) returns text language sql stable
as $$ select case when ef_visible(p) and p.first_name is not null
                  then p.first_name || coalesce(' ' || left(p.last_name, 1) || '.', '') end $$;

-- real names: letters, spaces, apostrophes, dots and hyphens; rude whole words are refused
create or replace function public.ef_person_name(p_name text) returns text language plpgsql immutable
as $$
declare n text := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
begin
  if n !~ '^[A-Za-zÀ-ÖØ-öø-ɏ][A-Za-zÀ-ÖØ-öø-ɏ ''.-]{0,29}$' then
    raise exception 'Names use letters only (up to 30).' using errcode = '22023';
  end if;
  if lower(n) ~ '\m(fuck\w*|shit\w*|bitch\w*|cunt\w*|pussy\w*|nigg\w*|fag\w*|whore\w*|slut\w*|porn\w*|bomboclaat|bumboclaat|raas\w*|pussyclaat|rapist)\M' then
    raise exception 'Please use your real name.' using errcode = '22023';
  end if;
  return upper(left(n, 1)) || substr(n, 2);
end $$;

-- group names: short, plain, polite
create or replace function public.ef_group_name(p_name text) returns text language plpgsql immutable
as $$
declare n text := regexp_replace(trim(coalesce(p_name, '')), '[[:space:]]+', ' ', 'g');
begin
  n := regexp_replace(n, '[^A-Za-zÀ-ÖØ-öø-ɏ0-9 _.,!?&()''#+-]', '', 'g');
  if char_length(n) < 1 or char_length(n) > 40 then raise exception 'Group names are 1–40 characters.' using errcode = '22023'; end if;
  if lower(n) ~ '(fuck|shit|bitch|cunt|pussy|nigg|whore|slut|porn|bomboclaat|bumbo|raas|pussyclaat|\mfag|\msex\M|\mkill)' then
    raise exception 'Please choose a different name.' using errcode = '22023';
  end if;
  return n;
end $$;

-- can u reach t (challenge them, add them to a group)? Yes if t follows u, or both are 13+ at the same school and t is findable
create or replace function public.ef_can_reach(u uuid, t uuid) returns boolean language sql stable
security definer set search_path = public
as $$
  select u <> t and (
    exists (select 1 from follows where follower = t and followee = u)
    or exists (select 1 from profiles a join profiles b on b.id = t where a.id = u and a.school_id is not null
               and a.school_id = b.school_id and ef_visible(b) and coalesce(ef_age(a) >= 13, false)))
$$;

-- a person card other students may see
create or replace function public.ef_person_json(p public.profiles, viewer uuid) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('username', p.username, 'avatar', p.avatar, 'grade', p.grade, 'league', p.league,
    'name', ef_display(p), 'school', (select s.name from schools s where s.id = p.school_id),
    'xp_week', case when p.week = ef_week() then p.xp_week else 0 end, 'xp_total', p.xp_total,
    'online', coalesce(p.last_seen > now() - interval '5 minutes', false),
    'i_follow', exists (select 1 from follows where follower = viewer and followee = p.id),
    'follows_me', exists (select 1 from follows where follower = p.id and followee = viewer))
$$;

-- what only you see about yourself
create or replace function public.ef_profile_json(p_id uuid) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'avatar', p.avatar, 'grade', p.grade, 'league', p.league, 'name', ef_display(p),
    'followers', (select count(*) from follows where followee = p.id),
    'following', (select count(*) from follows where follower = p.id),
    'school_rank', (select t.rk from (select q.id, row_number() over (order by (case when q.week = ef_week() then q.xp_week else 0 end) desc, q.xp_total desc) as rk
                    from profiles q where q.school_id = p.school_id) t where t.id = p.id),
    'friends_rank', (select t.rk from (select q.id, row_number() over (order by (case when q.week = ef_week() then q.xp_week else 0 end) desc, q.xp_total desc) as rk
                     from profiles q where q.id = p.id or q.id in (select followee from follows where follower = p.id)) t where t.id = p.id),
    'xp_total', p.xp_total, 'xp_week', case when p.week = ef_week() then p.xp_week else 0 end,
    'school', case when s.id is null then null else ef_school_json(s) end,
    'last_result', p.last_result, 'has_code', exists (select 1 from secrets where user_id = p.id),
    'online', coalesce(p.last_seen > now() - interval '5 minutes', false),
    'week_ends', ((ef_week() + 7)::timestamp at time zone 'America/Jamaica'))
  from profiles p left join schools s on s.id = p.school_id where p.id = p_id
$$;

create or replace function public.ef_private_json(p_id uuid) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('first_name', p.first_name, 'last_name', p.last_name, 'age', ef_age(p), 'purpose', p.purpose,
    'findable', p.findable, 'reminders', p.reminders, 'onboarded', p.onboarded, 'name', ef_display(p),
    'referrals', (select count(*) from profiles r where r.referred_by = p.id))
  from profiles p where p.id = p_id
$$;

create or replace function public.ef_me_json(p_id uuid) returns jsonb language sql stable
security definer set search_path = public
as $$ select ef_profile_json(p_id) || coalesce(ef_private_json(p_id), '{}'::jsonb) $$;

-- ---------------------------------------------------------------- v6: you
create or replace function public.ef_me() returns jsonb language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then return null; end if;
  perform ef_close_weeks();
  update profiles set last_seen = now() where id = auth.uid() and (last_seen is null or last_seen < now() - interval '1 minute');
  if not found and not exists (select 1 from profiles where id = auth.uid()) then return null; end if;
  return ef_me_json(auth.uid());
end $$;

-- onboarding (and editing the same details later from Settings). p: first, last, age, purpose, grade, school,
-- findable, reminders, avatar, ref (the username of the friend who invited you)
create or replace function public.ef_onboard(p jsonb) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare
  u uuid := ef_uid(); fn text; ln text; age integer; pur text; gr integer; sch bigint; fnd boolean; rem boolean;
  av text := p ->> 'avatar'; refid uuid; uname text; base text; k integer := 0;
begin
  if jsonb_typeof(p) <> 'object' then raise exception 'Something went wrong. Try again.' using errcode = '22023'; end if;
  fn := ef_person_name(p ->> 'first');
  ln := ef_person_name(p ->> 'last');
  begin age := (p ->> 'age')::integer; exception when others then age := null; end;
  if age is null or age < 5 or age > 100 then raise exception 'Enter your age (5–100).' using errcode = '22023'; end if;
  pur := case when p ->> 'purpose' in ('school', 'university', 'work', 'other') then p ->> 'purpose' else 'other' end;
  begin gr := nullif(p ->> 'grade', '')::integer; exception when others then gr := null; end;
  if gr is not null and (gr < 6 or gr > 13) then gr := null; end if;
  begin sch := nullif(p ->> 'school', '')::bigint; exception when others then sch := null; end;
  if sch is not null and not exists (select 1 from schools where id = sch) then raise exception 'That school wasn''t found.' using errcode = '22023'; end if;
  fnd := coalesce((p ->> 'findable')::boolean, true) and age >= 13;
  rem := coalesce((p ->> 'reminders')::boolean, false);
  if av is not null and av !~ '^[a-z]{2,16}$' then av := null; end if;

  if exists (select 1 from profiles where id = u) then
    update profiles set first_name = fn, last_name = ln, birth_year = extract(year from ef_today())::int - age, purpose = pur,
      grade = coalesce(gr, case when p ? 'grade' then null else grade end), school_id = coalesce(sch, case when p ? 'school' then null else school_id end),
      findable = fnd, reminders = rem, avatar = coalesce(av, avatar), onboarded = true, last_seen = now(), updated_at = now()
    where id = u;
    return ef_me_json(u);
  end if;

  -- a new account gets a username made from the first name and last initial, e.g. AnaB482 (it can be changed in Settings)
  base := left(regexp_replace(fn, '[^A-Za-z]', '', 'g'), 12) || upper(left(regexp_replace(ln, '[^A-Za-z]', '', 'g'), 1));
  if char_length(base) < 2 then base := 'Zinger'; end if;
  begin perform ef_check_name(base || '100'); exception when others then base := 'Zinger'; end;
  loop
    k := k + 1;
    uname := base || (100 + floor(random() * 900))::int::text;
    if k > 12 then uname := 'Zinger' || (100000 + floor(random() * 900000))::int::text; end if;
    begin
      uname := ef_check_name(uname);
    exception when others then
      uname := null;
    end;
    exit when uname is not null and not exists (select 1 from profiles where lower(username) = lower(uname));
    if k > 30 then raise exception 'Couldn''t make your account. Try again.' using errcode = '23505'; end if;
  end loop;
  if nullif(p ->> 'ref', '') is not null then
    select id into refid from profiles where lower(username) = lower(trim(p ->> 'ref')) and id <> u;
  end if;
  insert into profiles (id, username, school_id, grade, avatar, week, day, first_name, last_name, birth_year, purpose,
                        findable, reminders, onboarded, referred_by, last_seen)
  values (u, uname, sch, gr, av, ef_week(), ef_today(), fn, ln, extract(year from ef_today())::int - age, pur,
          fnd, rem, true, refid, now());
  return ef_me_json(u);
end $$;

create or replace function public.ef_set_prefs(p jsonb) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  update profiles set
    findable = case when p ? 'findable' then coalesce((p ->> 'findable')::boolean, findable) and coalesce(ef_age(profiles) >= 13, false) else findable end,
    reminders = case when p ? 'reminders' then coalesce((p ->> 'reminders')::boolean, reminders) else reminders end,
    updated_at = now()
  where id = u;
  if not found then raise exception 'Please join first.' using errcode = '28000'; end if;
  return ef_me_json(u);
end $$;

-- XP also lands in today's row of xp_days (for month boards), and marks you as "playing now"
create or replace function public.ef_add_xp(p_n integer) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); d date := ef_today(); w date := ef_week(); n integer := least(greatest(coalesce(p_n, 0), 0), 400); p profiles;
begin
  perform ef_close_weeks();
  select * into p from profiles where id = u for update;
  if not found then raise exception 'Please join first.' using errcode = '28000'; end if;
  n := least(n, greatest(0, 5000 - case when p.day = d then p.xp_day else 0 end));
  update profiles set
    xp_total = xp_total + n,
    xp_week = (case when week = w then xp_week else 0 end) + n, week = w,
    xp_day = (case when day = d then xp_day else 0 end) + n, day = d,
    last_seen = now(), updated_at = now()
  where id = u returning * into p;
  if n > 0 then
    insert into xp_days (user_id, day, xp) values (u, d, n)
    on conflict (user_id, day) do update set xp = xp_days.xp + excluded.xp;
  end if;
  return jsonb_build_object('added', n, 'xp_week', p.xp_week, 'xp_total', p.xp_total, 'league', p.league);
end $$;

-- school board: this week, this month or all time
create or replace function public.ef_school_board(p_school bigint, p_period text default 'week') returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := auth.uid(); w date := ef_week(); m date := date_trunc('month', ef_today())::date; s schools; rows jsonb;
  members integer; xp bigint; friends integer; per text := case when p_period in ('month', 'all') then p_period else 'week' end;
begin
  perform ef_close_weeks();
  select * into s from schools where id = p_school;
  if not found then return null; end if;
  select count(*), coalesce(sum(case when week = w then xp_week else 0 end), 0) into members, xp from profiles where school_id = s.id;
  select count(*) into friends from profiles p where p.school_id = s.id and p.id in (select followee from follows where follower = u);
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by t.xp desc, t.xp_total desc) as rank, t.username, t.avatar, t.grade, t.league, t.xp, t.me, t.friend, t.name
    from (
      select p.username, p.avatar, p.grade, p.league, p.xp_total, p.id = u as me, ef_display(p) as name,
             exists (select 1 from follows f where f.follower = u and f.followee = p.id) as friend,
             case when per = 'all' then p.xp_total
                  when per = 'month' then coalesce((select sum(d.xp) from xp_days d where d.user_id = p.id and d.day >= m), 0)
                  when p.week = w then p.xp_week else 0 end as xp
      from profiles p where p.school_id = s.id) t
    order by t.xp desc, t.xp_total desc limit 100) x;
  return jsonb_build_object('school', ef_school_json(s) || jsonb_build_object('members', members, 'xp_week', xp, 'friends', friends),
    'period', per, 'rows', rows, 'week_ends', ((w + 7)::timestamp at time zone 'America/Jamaica'),
    'month_ends', ((m + interval '1 month')::timestamp at time zone 'America/Jamaica'));
end $$;

-- ---------------------------------------------------------------- v6: friends
-- people to follow: those who follow you, then classmates (your grade first), then friends of friends at your school.
-- With p_q, search your school by name or username, or anyone by exact username.
create or replace function public.ef_suggest(p_q text default null, p_school_only boolean default false) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); me profiles; q text := lower(trim(coalesce(p_q, ''))); rows jsonb;
begin
  select * into me from profiles where id = u;
  if not found then return '[]'::jsonb; end if;
  update profiles set last_seen = now() where id = u and (last_seen is null or last_seen < now() - interval '1 minute');
  select coalesce(jsonb_agg(ef_person_json(pp, u) order by x.score desc, pp.xp_total desc), '[]'::jsonb) into rows from (
    select p.id,
      (case when exists (select 1 from follows f where f.follower = p.id and f.followee = u) then 100 else 0 end
       + case when me.school_id is not null and p.school_id = me.school_id then 40 else 0 end
       + case when p.grade is not null and p.grade = me.grade then 15 else 0 end
       + case when exists (select 1 from follows a join follows b on b.follower = a.followee where a.follower = u and b.followee = p.id) then 10 else 0 end
       + case when p.last_seen > now() - interval '7 days' then 5 else 0 end) as score
    from profiles p
    where p.id <> u
      and (q <> '' or not exists (select 1 from follows f where f.follower = u and f.followee = p.id))
      and (
        (q = '' and (exists (select 1 from follows f where f.follower = p.id and f.followee = u) and not p_school_only
                     or (me.school_id is not null and p.school_id = me.school_id and ef_visible(p))))
        or (q <> '' and (lower(p.username) = q
                         or (me.school_id is not null and p.school_id = me.school_id and ef_visible(p)
                             and (lower(p.username) like q || '%' or lower(p.first_name) like q || '%' or lower(p.first_name || ' ' || coalesce(p.last_name, '')) like q || '%'))))
      )
    order by score desc, p.xp_total desc limit 40) x join profiles pp on pp.id = x.id;
  return rows;
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

-- ---------------------------------------------------------------- v6: Live challenges
create or replace function public.ef_challenge(p_username text, p_code text, p_subject text, p_topic text default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); t uuid; topic text;
begin
  if not exists (select 1 from profiles where id = u) then raise exception 'Please join first.' using errcode = '28000'; end if;
  select id into t from profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if t is null then raise exception 'Nobody with that name yet.' using errcode = 'P0002'; end if;
  if not ef_can_reach(u, t) then raise exception 'You can challenge friends who follow you, or classmates.' using errcode = '42501'; end if;
  if coalesce(p_code, '') !~ '^[A-HJ-NP-Z2-9]{6}$' or coalesce(p_subject, '') !~ '^[a-z0-9-]{2,40}$' then
    raise exception 'That game code isn''t right.' using errcode = '22023';
  end if;
  topic := nullif(left(regexp_replace(trim(coalesce(p_topic, '')), '[^A-Za-zÀ-ÖØ-öø-ɏ0-9 ,.&()''/+:-]', '', 'g'), 80), '');
  perform ef_rate('challenge', 80);
  delete from live_invites where sender = u and recipient = t;
  insert into live_invites (sender, recipient, code, subject, topic) values (u, t, p_code, p_subject, topic);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ef_challenges() returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'code', i.code, 'subject', i.subject, 'topic', i.topic,
    'created_at', i.created_at, 'expires_at', i.expires_at, 'from', ef_person_json(p, auth.uid())) order by i.created_at desc), '[]'::jsonb)
  from live_invites i join profiles p on p.id = i.sender
  where i.recipient = auth.uid() and i.status = 'sent' and i.expires_at > now()
$$;

create or replace function public.ef_challenge_answer(p_id uuid, p_status text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  update live_invites set status = case when p_status = 'joined' then 'joined' else 'declined' end
  where id = p_id and recipient = u;
  return jsonb_build_object('ok', found);
end $$;

-- ---------------------------------------------------------------- v6: the Social page and the bell
create or replace function public.ef_social() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); me profiles; mine integer; rivals jsonb;
begin
  select * into me from profiles where id = u;
  if not found then return null; end if;
  update profiles set last_seen = now() where id = u;
  mine := case when me.week = ef_week() then me.xp_week else 0 end;
  -- rivals: people you follow, and classmates you can see, closest to your XP this week
  select coalesce(jsonb_agg(ef_person_json(pp, u) order by x.gap, pp.xp_total desc), '[]'::jsonb) into rivals from (
    select p.id, abs((case when p.week = ef_week() then p.xp_week else 0 end) - mine) as gap
    from profiles p
    where p.id <> u and (p.id in (select followee from follows where follower = u)
                         or (me.school_id is not null and p.school_id = me.school_id and ef_visible(p)))
    order by gap, p.xp_total desc limit 12) x join profiles pp on pp.id = x.id;
  return jsonb_build_object(
    'playing', (select count(*) from profiles where last_seen > now() - interval '5 minutes'),
    'rivals', rivals,
    'challenges', ef_challenges(),
    'unread', (select coalesce(sum((select count(*) from group_messages g where g.group_id = m.group_id and g.id > m.last_read and g.sender is distinct from u)), 0)
               from group_members m where m.user_id = u),
    'new_followers', (select count(*) from follows f where f.followee = u and f.created_at > coalesce(me.inbox_seen, '-infinity'::timestamptz)),
    'xp_week', mine);
end $$;

create or replace function public.ef_inbox() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); seen timestamptz;
begin
  select inbox_seen into seen from profiles where id = u;
  return jsonb_build_object(
    'challenges', ef_challenges(),
    'followers', (select coalesce(jsonb_agg(ef_person_json(p, u) || jsonb_build_object('at', f.created_at, 'new', f.created_at > coalesce(seen, '-infinity'::timestamptz)) order by f.created_at desc), '[]'::jsonb)
                  from (select * from follows where followee = u order by created_at desc limit 20) f join profiles p on p.id = f.follower));
end $$;

create or replace function public.ef_inbox_seen() returns jsonb language plpgsql
security definer set search_path = public
as $$
begin
  update profiles set inbox_seen = now() where id = ef_uid();
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- v6: study groups
create or replace function public.ef_group_msg_json(g public.group_messages) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object('id', g.id, 'kind', g.kind, 'body', g.body, 'at', g.created_at, 'mine', g.sender = auth.uid(),
    'from', (select jsonb_build_object('username', p.username, 'avatar', p.avatar, 'name', ef_display(p)) from profiles p where p.id = g.sender))
$$;

create or replace function public.ef_groups() returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(x.j order by x.last_at desc), '[]'::jsonb) from (
    select g.last_at, jsonb_build_object('id', g.id, 'name', g.name, 'color', g.color, 'mine', g.owner = auth.uid(),
      'members', (select count(*) from group_members mm where mm.group_id = g.id),
      'faces', (select coalesce(jsonb_agg(jsonb_build_object('username', p.username, 'avatar', p.avatar)), '[]'::jsonb) from
                 (select p.* from group_members mm join profiles p on p.id = mm.user_id where mm.group_id = g.id and p.id <> auth.uid() order by mm.joined_at limit 3) p),
      'last', (select ef_group_msg_json(gm) from group_messages gm where gm.group_id = g.id order by gm.id desc limit 1),
      'unread', (select count(*) from group_messages gm where gm.group_id = g.id and gm.id > m.last_read and gm.sender is distinct from auth.uid())) as j
    from group_members m join study_groups g on g.id = m.group_id
    where m.user_id = auth.uid()
    order by g.last_at desc limit 50) x
$$;

create or replace function public.ef_group_note(p_group uuid, p_text text) returns void language sql
security definer set search_path = public
as $$
  insert into group_messages (group_id, sender, kind, body) values (p_group, null, 'system', jsonb_build_object('t', left(p_text, 120)));
  update study_groups set last_at = now() where id = p_group;
$$;

create or replace function public.ef_group_create(p_name text, p_usernames text[]) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); me profiles; nm text := ef_group_name(p_name); gid uuid; t uuid; who text; n integer := 0;
  colors text[] := array['#0b8a5e', '#ff5e4d', '#3a8dff', '#7a5cff', '#e0a100', '#e255b4', '#14b8c4'];
begin
  select * into me from profiles where id = u;
  if not found then raise exception 'Please join first.' using errcode = '28000'; end if;
  perform ef_rate('group', 10);
  insert into study_groups (name, owner, color) values (nm, u, colors[1 + floor(random() * array_length(colors, 1))::int]) returning id into gid;
  insert into group_members (group_id, user_id) values (gid, u);
  perform ef_group_note(gid, me.username || ' made the group');
  -- your own "made the group" note isn't unread for you; the people you add will see it
  update group_members set last_read = (select max(id) from group_messages where group_id = gid) where group_id = gid and user_id = u;
  foreach who in array (coalesce(p_usernames, '{}'::text[]))[1:29] loop
    select id into t from profiles where lower(username) = lower(trim(who));
    if t is not null and ef_can_reach(u, t) then
      insert into group_members (group_id, user_id) values (gid, t) on conflict do nothing;
      if found then n := n + 1; end if;
    end if;
  end loop;
  return jsonb_build_object('id', gid, 'added', n);
end $$;

create or replace function public.ef_group_get(p_id uuid, p_after bigint default 0) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); g study_groups; msgs jsonb; top bigint;
begin
  select s.* into g from study_groups s join group_members m on m.group_id = s.id and m.user_id = u where s.id = p_id;
  if not found then raise exception 'You''re not in that group.' using errcode = '42501'; end if;
  select coalesce(jsonb_agg(ef_group_msg_json(g2) order by g2.id), '[]'::jsonb), max(g2.id) into msgs, top
  from group_messages g2 where g2.id in (select id from group_messages where group_id = p_id and id > coalesce(p_after, 0) order by id desc limit 80);
  if top is not null then update group_members set last_read = greatest(last_read, top) where group_id = p_id and user_id = u; end if;
  return jsonb_build_object('id', g.id, 'name', g.name, 'color', g.color, 'mine', g.owner = u, 'messages', msgs,
    'members', (select coalesce(jsonb_agg(ef_person_json(p, u) order by mm.joined_at), '[]'::jsonb)
                from group_members mm join profiles p on p.id = mm.user_id where mm.group_id = p_id));
end $$;

-- p_kind: emoji {e}, phrase {p: number}, card {sid, k, h}, live {code, sid}
create or replace function public.ef_group_send(p_id uuid, p_kind text, p_body jsonb) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); b jsonb; r group_messages;
begin
  if not exists (select 1 from group_members where group_id = p_id and user_id = u) then raise exception 'You''re not in that group.' using errcode = '42501'; end if;
  if p_kind = 'emoji' and (p_body ->> 'e') in ('👍', '🔥', '😂', '🎉', '💯', '🙏', '😮', '❤️', '👏', '🤔', '😴', '🧠', '📚', '✅', '🐦') then
    b := jsonb_build_object('e', p_body ->> 'e');
  elsif p_kind = 'phrase' and (p_body ->> 'p') ~ '^[0-9]{1,2}$' and (p_body ->> 'p')::int between 0 and 23 then
    b := jsonb_build_object('p', (p_body ->> 'p')::int);
  elsif p_kind = 'card' and (p_body ->> 'sid') ~ '^[a-z0-9-]{2,40}$' and (p_body ->> 'k') ~ '^[0-9]{1,4}$' and coalesce(p_body ->> 'h', '') ~ '^[0-9a-z]{1,12}$' then
    b := jsonb_build_object('sid', p_body ->> 'sid', 'k', (p_body ->> 'k')::int, 'h', p_body ->> 'h');
  elsif p_kind = 'live' and (p_body ->> 'code') ~ '^[A-HJ-NP-Z2-9]{6}$' and (p_body ->> 'sid') ~ '^[a-z0-9-]{2,40}$' then
    b := jsonb_build_object('code', p_body ->> 'code', 'sid', p_body ->> 'sid');
  else
    raise exception 'That message can''t be sent.' using errcode = '22023';
  end if;
  perform ef_rate('msg', 600);
  insert into group_messages (group_id, sender, kind, body) values (p_id, u, p_kind, b) returning * into r;
  update study_groups set last_at = now() where id = p_id;
  update group_members set last_read = greatest(last_read, r.id) where group_id = p_id and user_id = u;
  return ef_group_msg_json(r);
end $$;

create or replace function public.ef_group_add(p_id uuid, p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); t profiles;
begin
  if not exists (select 1 from group_members where group_id = p_id and user_id = u) then raise exception 'You''re not in that group.' using errcode = '42501'; end if;
  if (select count(*) from group_members where group_id = p_id) >= 30 then raise exception 'Groups hold up to 30 people.' using errcode = '54000'; end if;
  select * into t from profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if not found then raise exception 'Nobody with that name yet.' using errcode = 'P0002'; end if;
  if not ef_can_reach(u, t.id) then raise exception 'You can add friends who follow you, or classmates.' using errcode = '42501'; end if;
  insert into group_members (group_id, user_id) values (p_id, t.id) on conflict do nothing;
  if found then perform ef_group_note(p_id, t.username || ' joined'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ef_group_leave(p_id uuid) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); nm text;
begin
  delete from group_members where group_id = p_id and user_id = u;
  if not found then return jsonb_build_object('ok', false); end if;
  select username into nm from profiles where id = u;
  if not exists (select 1 from group_members where group_id = p_id) then delete from study_groups where id = p_id;
  else perform ef_group_note(p_id, coalesce(nm, 'Someone') || ' left'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ---------------------------------------------------------------- v6: moving devices and deleting, updated for the new tables

create or replace function public.ef_profile(p_username text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare t uuid; out jsonb;
begin
  perform ef_close_weeks();
  select id into t from profiles where lower(username) = lower(trim(coalesce(p_username, '')));
  if t is null then return null; end if;
  out := ef_profile_json(t) - 'id' - 'has_code' - 'last_result';
  return out || jsonb_build_object('me', t = auth.uid(),
    'i_follow', exists (select 1 from follows where follower = auth.uid() and followee = t),
    'follows_me', exists (select 1 from follows where follower = t and followee = auth.uid()),
    'can_challenge', auth.uid() is not null and ef_can_reach(auth.uid(), t));
end $$;

create or replace function public.ef_save_profile(p_username text, p_school bigint, p_grade integer, p_avatar text default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); n text := ef_check_name(p_username);
begin
  if p_avatar is not null and p_avatar !~ '^[a-z]{2,16}$' then p_avatar := null; end if;
  if p_school is not null and not exists (select 1 from schools where id = p_school) then
    raise exception 'That school wasn''t found.' using errcode = '22023';
  end if;
  if exists (select 1 from profiles where lower(username) = lower(n) and id <> u) then
    raise exception 'That name is taken. Try another one.' using errcode = '23505';
  end if;
  insert into profiles (id, username, school_id, grade, avatar, week, day, last_seen)
  values (u, n, p_school, p_grade, p_avatar, ef_week(), ef_today(), now())
  on conflict (id) do update set username = excluded.username, school_id = excluded.school_id,
    grade = excluded.grade, avatar = coalesce(excluded.avatar, profiles.avatar), updated_at = now();
  return ef_me_json(u);
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
  update profiles set referred_by = null where referred_by = u;
  delete from follows where follower = u or followee = u;
  delete from shared_sets where owner = u;
  delete from set_saves where user_id = u;
  delete from saves where user_id = u;
  delete from secrets where user_id = u;
  delete from profiles where id = u;
  return jsonb_build_object('deleted', true);
end $$;

-- ---------------------------------------------------------------- permissions
-- Only the ef_* functions meant for the website are callable by it; helpers stay private.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and left(p.proname, 3) = 'ef_' loop
    -- Supabase grants every new function to anon/authenticated by default, so revoke from them explicitly too
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    if f.proname not in ('ef_today', 'ef_week', 'ef_uid', 'ef_rate', 'ef_check_name', 'ef_close_weeks', 'ef_profile_json', 'ef_kind_group', 'ef_school_json',
                           'ef_age', 'ef_visible', 'ef_display', 'ef_person_name', 'ef_group_name', 'ef_can_reach', 'ef_person_json',
                           'ef_private_json', 'ef_me_json', 'ef_group_msg_json', 'ef_group_note') then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
end $$;
