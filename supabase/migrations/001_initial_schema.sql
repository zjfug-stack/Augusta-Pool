-- ============================================================
-- Masters Pool – Initial Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ----------------------------------------------------------
-- 1. golfers
-- ----------------------------------------------------------
create type golfer_status as enum ('active', 'cut', 'wd', 'dq');

create table if not exists golfers (
  id             bigint primary key generated always as identity,
  name           text    not null,
  tier           smallint not null check (tier between 1 and 6),
  current_score  integer  not null default 0,
  status         golfer_status not null default 'active'
);

-- ----------------------------------------------------------
-- 2. entries
-- ----------------------------------------------------------
create table if not exists entries (
  id                bigint primary key generated always as identity,
  entrant_name      text    not null,
  tier1_golfer_id   bigint  not null references golfers(id),
  tier2_golfer_id   bigint  not null references golfers(id),
  tier3_golfer_id   bigint  not null references golfers(id),
  tier4_golfer_id   bigint  not null references golfers(id),
  tier5_golfer_id   bigint  not null references golfers(id),
  tier6_golfer_id   bigint  not null references golfers(id),
  tiebreak_guess    integer not null,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------
-- 3. pool_settings  (single-row config table)
-- ----------------------------------------------------------
create table if not exists pool_settings (
  id                bigint primary key generated always as identity,
  submissions_open  boolean not null default true,
  winner_score      integer
);

-- Seed one default settings row so the app always has a row to read/update.
insert into pool_settings (submissions_open, winner_score)
values (true, null);

-- ----------------------------------------------------------
-- Row-Level Security  (enable but keep permissive for now;
-- tighten per your auth requirements)
-- ----------------------------------------------------------
alter table golfers      enable row level security;
alter table entries      enable row level security;
alter table pool_settings enable row level security;

-- Public read access for all three tables
create policy "public read golfers"
  on golfers for select using (true);

create policy "public read entries"
  on entries for select using (true);

create policy "public read pool_settings"
  on pool_settings for select using (true);

-- Allow anyone to insert an entry (submissions are open)
create policy "public insert entries"
  on entries for insert with check (true);
