-- ExamForge cloud: schools, weekly leagues, friends, cloud saves and each school's shared study sets.
-- Run this once in the Supabase SQL editor (safe to run again).
--
-- Security model: every table has row-level security turned ON with NO policies, so the browser can't read or
-- write tables directly. All access goes through the ef_* functions below, which check who is calling
-- (auth.uid()), validate input and cap XP. The public "anon" key in the website can only call these functions.

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
create unique index if not exists schools_name_country on public.schools (lower(name), country);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  school_id bigint references public.schools (id) on delete set null,
  grade smallint check (grade is null or grade between 6 and 13),
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
create or replace function public.ef_profile_json(p_id uuid) returns jsonb language sql stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'grade', p.grade, 'league', p.league,
    'xp_total', p.xp_total, 'xp_week', case when p.week = ef_week() then p.xp_week else 0 end,
    'school', case when s.id is null then null else jsonb_build_object('id', s.id, 'name', s.name, 'region', s.region, 'country', s.country) end,
    'last_result', p.last_result, 'has_code', exists (select 1 from secrets where user_id = p.id),
    'week_ends', ((ef_week() + 7)::timestamp at time zone 'America/Jamaica'))
  from profiles p left join schools s on s.id = p.school_id where p.id = p_id
$$;

create or replace function public.ef_me() returns jsonb language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then return null; end if;
  perform ef_close_weeks();
  return ef_profile_json(auth.uid());
end $$;

create or replace function public.ef_username_free(p_username text) returns jsonb language sql stable
security definer set search_path = public
as $$
  select to_jsonb(not exists (select 1 from profiles where lower(username) = lower(trim(p_username)) and id is distinct from auth.uid()))
$$;

create or replace function public.ef_save_profile(p_username text, p_school bigint, p_grade integer) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); n text := ef_check_name(p_username);
begin
  if p_school is not null and not exists (select 1 from schools where id = p_school) then
    raise exception 'That school wasn''t found.' using errcode = '22023';
  end if;
  if exists (select 1 from profiles where lower(username) = lower(n) and id <> u) then
    raise exception 'That name is taken. Try another one.' using errcode = '23505';
  end if;
  insert into profiles (id, username, school_id, grade, week, day)
  values (u, n, p_school, p_grade, ef_week(), ef_today())
  on conflict (id) do update set username = excluded.username, school_id = excluded.school_id,
    grade = excluded.grade, updated_at = now();
  return ef_profile_json(u);
end $$;

-- XP: the site sends small batches; each call is capped and each day is capped, so nobody can fake their way up
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
    updated_at = now()
  where id = u returning * into p;
  return jsonb_build_object('added', n, 'xp_week', p.xp_week, 'xp_total', p.xp_total, 'league', p.league);
end $$;

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
    select row_number() over (order by p.xp_week desc, p.updated_at) as rank, p.username, s.name as school, p.xp_week as xp, p.id = u as me
    from profiles p left join schools s on s.id = p.school_id
    where p.league = me.league and p.week = w and (p.xp_week > 0 or p.id = u)
    order by p.xp_week desc, p.updated_at limit 50) x;
  return jsonb_build_object('league', me.league, 'rows', rows, 'total', n, 'my_rank', my_rank,
    'promote', case when me.league < 9 then greatest(1, ceil(n * 0.2)) else 0 end,
    'demote', case when me.league > 1 and n >= 5 then floor(n * 0.2) else 0 end,
    'week_ends', ((w + 7)::timestamp at time zone 'America/Jamaica'), 'last_result', me.last_result);
end $$;

create or replace function public.ef_school_board(p_school bigint) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := auth.uid(); w date := ef_week(); s schools; rows jsonb; members integer; xp bigint;
begin
  perform ef_close_weeks();
  select * into s from schools where id = p_school;
  if not found then return null; end if;
  select count(*), coalesce(sum(case when week = w then xp_week else 0 end), 0) into members, xp from profiles where school_id = s.id;
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by (case when p.week = w then p.xp_week else 0 end) desc, p.xp_total desc) as rank,
           p.username, p.grade, p.league, case when p.week = w then p.xp_week else 0 end as xp, p.id = u as me
    from profiles p where p.school_id = s.id
    order by (case when p.week = w then p.xp_week else 0 end) desc, p.xp_total desc limit 50) x;
  return jsonb_build_object('school', jsonb_build_object('id', s.id, 'name', s.name, 'region', s.region, 'country', s.country, 'members', members, 'xp_week', xp),
    'rows', rows, 'week_ends', ((w + 7)::timestamp at time zone 'America/Jamaica'));
end $$;

create or replace function public.ef_schools_board(p_country text default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare w date := ef_week(); rows jsonb;
begin
  perform ef_close_weeks();
  select coalesce(jsonb_agg(to_jsonb(x) order by x.rank), '[]'::jsonb) into rows from (
    select row_number() over (order by sum(case when p.week = w then p.xp_week else 0 end) desc, count(*) desc, s.name) as rank,
           s.id, s.name, s.region, s.country, count(*) as members, sum(case when p.week = w then p.xp_week else 0 end) as xp
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
           p.username, s.name as school, p.league, case when p.week = w then p.xp_week else 0 end as xp, p.id = u as me
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
create or replace function public.ef_search_schools(p_q text, p_country text default null) returns jsonb language sql stable
security definer set search_path = public
as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) from (
    select s.id, s.name, s.region, s.country, s.kind, (select count(*) from profiles p where p.school_id = s.id) as members
    from schools s
    where char_length(trim(coalesce(p_q, ''))) >= 2
      and s.name ilike '%' || replace(replace(replace(trim(p_q), '\', '\\'), '%', '\%'), '_', '\_') || '%'
      and (p_country is null or s.country = p_country)
    order by (lower(s.name) like lower(trim(p_q)) || '%') desc, members desc, s.name
    limit 20) x
$$;

create or replace function public.ef_add_school(p_name text, p_country text, p_region text default null, p_kind text default null,
  p_osm text default null, p_lat double precision default null, p_lon double precision default null) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); nm text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'); c text := upper(trim(coalesce(p_country, 'JM'))); s schools;
begin
  if char_length(nm) < 2 or char_length(nm) > 120 then raise exception 'Type the school''s full name.' using errcode = '22023'; end if;
  if c !~ '^[A-Z]{2}$' then raise exception 'Unknown country.' using errcode = '22023'; end if;
  if p_osm is not null and p_osm !~ '^(node|way|relation)/[0-9]+$' then p_osm := null; end if;
  select * into s from schools where (p_osm is not null and osm_ref = p_osm) or (lower(name) = lower(nm) and country = c) limit 1;
  if not found then
    perform ef_rate('add_school', 10);
    insert into schools (name, country, region, kind, osm_ref, lat, lon, added_by)
    values (nm, c, nullif(left(trim(coalesce(p_region, '')), 80), ''), nullif(left(trim(coalesce(p_kind, '')), 40), ''), p_osm, p_lat, p_lon, u)
    returning * into s;
  end if;
  return jsonb_build_object('id', s.id, 'name', s.name, 'region', s.region, 'country', s.country);
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

create or replace function public.ef_claim(p_code text) returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid(); raw text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')); old uuid;
begin
  perform ef_rate('claim', 10);
  select user_id into old from secrets where code_hash = encode(sha256(convert_to(raw, 'UTF8')), 'hex');
  -- return (not raise) so the attempt still counts toward the daily limit; an exception would roll it back
  if old is null then return jsonb_build_object('error', 'That code didn''t work. Check it and try again.'); end if;
  if old = u then return ef_profile_json(u); end if;
  if exists (select 1 from profiles where id = u) then
    raise exception 'This device already has an account. Sign out first.' using errcode = '23505';
  end if;
  update profiles set id = u where id = old;
  update saves set user_id = u where user_id = old;
  update follows set follower = u where follower = old;
  update follows set followee = u where followee = old;
  update shared_sets set owner = u where owner = old;
  update set_saves set user_id = u where user_id = old;
  delete from secrets where user_id = old; -- codes work once; make a new one any time
  return ef_profile_json(u);
end $$;

create or replace function public.ef_delete_me() returns jsonb language plpgsql
security definer set search_path = public
as $$
declare u uuid := ef_uid();
begin
  delete from follows where follower = u or followee = u;
  delete from shared_sets where owner = u;
  delete from set_saves where user_id = u;
  delete from saves where user_id = u;
  delete from secrets where user_id = u;
  delete from profiles where id = u;
  return jsonb_build_object('deleted', true);
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

-- ---------------------------------------------------------------- permissions
-- Only the ef_* functions meant for the website are callable by it; helpers stay private.
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig, p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname like 'ef\_%' loop
    execute format('revoke all on function %s from public', f.sig);
    if f.proname not in ('ef_today', 'ef_week', 'ef_uid', 'ef_rate', 'ef_check_name', 'ef_close_weeks', 'ef_profile_json') then
      execute format('grant execute on function %s to anon, authenticated', f.sig);
    end if;
  end loop;
end $$;
