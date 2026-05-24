-- Paste this whole file into Supabase Dashboard → SQL Editor → New Query → Run.
--
-- ⚠️  DESTRUCTIVE: drops the previous custom-auth tables/functions (app_users,
-- create_user, verify_password) and the data tables, then recreates everything
-- using Supabase Auth (auth.users) as the source of identity. Ownership and
-- access control are enforced by Postgres RLS via auth.uid() — the anon key
-- can no longer bypass the rules.
--
-- ⚠️  Before running this, in the Supabase Dashboard:
--     Authentication → Providers → Email → Confirm email = OFF
-- (otherwise sign-ups attempt to email username@goatplanner.local which
--  bounces and counts against the free-tier email rate limit.)

drop table if exists exceptions cascade;
drop table if exists bookings   cascade;
drop table if exists teams      cascade;

drop function if exists create_user(text, text);
drop function if exists verify_password(text, text);
drop table if exists app_users cascade;

create table teams (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  color       text not null,
  description text,
  created_at  timestamptz not null default now()
);

create table bookings (
  id          text primary key,
  owner_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  team_id     text references teams(id) on delete cascade,
  title       text,
  color       text,
  description text,
  start_at    timestamptz not null,
  end_at      timestamptz not null,
  rrule       text,
  created_at  timestamptz not null default now(),
  constraint bookings_team_or_title check (
    team_id is not null or (title is not null and color is not null)
  )
);

create table exceptions (
  id              text primary key,
  owner_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  booking_id      text not null references bookings(id) on delete cascade,
  occurrence_at   timestamptz not null,
  deleted         boolean not null default false,
  team_id         text references teams(id),
  title           text,
  color           text,
  description     text,
  start_at        timestamptz,
  end_at          timestamptz,
  created_at      timestamptz not null default now(),
  unique (booking_id, occurrence_at)
);

create index idx_bookings_start     on bookings (start_at);
create index idx_exceptions_booking on exceptions (booking_id);
create index idx_teams_owner        on teams (owner_id);
create index idx_bookings_owner     on bookings (owner_id);
create index idx_exceptions_owner   on exceptions (owner_id);

alter table teams      enable row level security;
alter table bookings   enable row level security;
alter table exceptions enable row level security;

drop policy if exists "owner crud teams"      on teams;
drop policy if exists "owner crud bookings"   on bookings;
drop policy if exists "owner crud exceptions" on exceptions;
drop policy if exists "open teams"            on teams;
drop policy if exists "open bookings"         on bookings;
drop policy if exists "open exceptions"       on exceptions;

create policy "owner crud teams"
  on teams for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner crud bookings"
  on bookings for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "owner crud exceptions"
  on exceptions for all
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'teams'
  ) then
    alter publication supabase_realtime add table teams;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table bookings;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'exceptions'
  ) then
    alter publication supabase_realtime add table exceptions;
  end if;
end $$;
