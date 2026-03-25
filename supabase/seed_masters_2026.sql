-- ============================================================
-- Masters Pool — 2026 Masters Field Seed
-- Run this in the Supabase SQL Editor:
--   Dashboard → SQL Editor → New query → paste → Run
--
-- Tier assignments use OWGR (World Ranking) cutoffs:
--   T1 = Rank  1–5   T2 = Rank  6–15  T3 = Rank 16–30
--   T4 = Rank 31–50  T5 = Rank 51–75  T6 = Rank 76+ / past champions
--
-- Run seed_field.py (with your .env.local credentials) any time
-- before the tournament to refresh rankings automatically.
-- ============================================================

-- Clear existing golfers (cascades to entries — only run before entries are submitted)
-- TRUNCATE golfers RESTART IDENTITY CASCADE;

-- Safe upsert: insert or update by name
INSERT INTO golfers (name, tier, current_score, status) VALUES

-- ── Tier 1 · Rank 1–5 ────────────────────────────────────────
('Scottie Scheffler',     1, 0, 'active'),
('Rory McIlroy',          1, 0, 'active'),
('Xander Schauffele',     1, 0, 'active'),
('Viktor Hovland',        1, 0, 'active'),
('Jon Rahm',              1, 0, 'active'),

-- ── Tier 2 · Rank 6–15 ───────────────────────────────────────
('Collin Morikawa',       2, 0, 'active'),
('Patrick Cantlay',       2, 0, 'active'),
('Tommy Fleetwood',       2, 0, 'active'),
('Hideki Matsuyama',      2, 0, 'active'),
('Justin Thomas',         2, 0, 'active'),
('Shane Lowry',           2, 0, 'active'),
('Matt Fitzpatrick',      2, 0, 'active'),
('Tony Finau',            2, 0, 'active'),
('Keegan Bradley',        2, 0, 'active'),
('Brian Harman',          2, 0, 'active'),

-- ── Tier 3 · Rank 16–30 ──────────────────────────────────────
('Jordan Spieth',         3, 0, 'active'),
('Wyndham Clark',         3, 0, 'active'),
('Sahith Theegala',       3, 0, 'active'),
('Sam Burns',             3, 0, 'active'),
('Will Zalatoris',        3, 0, 'active'),
('Tom Kim',               3, 0, 'active'),
('Russell Henley',        3, 0, 'active'),
('Corey Conners',         3, 0, 'active'),
('Seamus Power',          3, 0, 'active'),
('Lucas Glover',          3, 0, 'active'),
('Jason Day',             3, 0, 'active'),
('Adam Scott',            3, 0, 'active'),
('Max Homa',              3, 0, 'active'),
('Tyrrell Hatton',        3, 0, 'active'),
('Sungjae Im',            3, 0, 'active'),

-- ── Tier 4 · Rank 31–50 ──────────────────────────────────────
('Dustin Johnson',        4, 0, 'active'),
('Brooks Koepka',         4, 0, 'active'),
('Si Woo Kim',            4, 0, 'active'),
('Tom Hoge',              4, 0, 'active'),
('Nick Taylor',           4, 0, 'active'),
('Byeong Hun An',         4, 0, 'active'),
('Austin Eckroat',        4, 0, 'active'),
('Eric Cole',             4, 0, 'active'),
('Denny McCarthy',        4, 0, 'active'),
('Davis Thompson',        4, 0, 'active'),
('Justin Rose',           4, 0, 'active'),
('Chris Kirk',            4, 0, 'active'),
('Danny Willett',         4, 0, 'active'),
('Camilo Villegas',       4, 0, 'active'),
('Chez Reavie',           4, 0, 'active'),

-- ── Tier 5 · Rank 51–75 ──────────────────────────────────────
('Rickie Fowler',         5, 0, 'active'),
('Cameron Young',         5, 0, 'active'),
('Min Woo Lee',           5, 0, 'active'),
('Christiaan Bezuidenhout', 5, 0, 'active'),
('Alex Noren',            5, 0, 'active'),
('Bubba Watson',          5, 0, 'active'),
('Zach Johnson',          5, 0, 'active'),
('Louis Oosthuizen',      5, 0, 'active'),
('Charl Schwartzel',      5, 0, 'active'),
('Victor Perez',          5, 0, 'active'),
('Patrick Reed',          5, 0, 'active'),
('Sergio Garcia',         5, 0, 'active'),
('Jason Kokrak',          5, 0, 'active'),
('Cam Davis',             5, 0, 'active'),
('Haotong Li',            5, 0, 'active'),

-- ── Tier 6 · Past Champions & other qualifiers ───────────────
('Tiger Woods',           6, 0, 'active'),
('Phil Mickelson',        6, 0, 'active'),
('Fred Couples',          6, 0, 'active'),
('Jose Maria Olazabal',   6, 0, 'active'),
('Mike Weir',             6, 0, 'active'),
('Sandy Lyle',            6, 0, 'active'),
('Larry Mize',            6, 0, 'active'),
('Bernhard Langer',       6, 0, 'active'),
('Nick Faldo',            6, 0, 'active'),
('Ian Woosnam',           6, 0, 'active'),
('Fuzzy Zoeller',         6, 0, 'active'),
('Ben Crenshaw',          6, 0, 'active'),
('Mark O''Meara',         6, 0, 'active'),
('Trevor Immelman',       6, 0, 'active'),
('Vijay Singh',           6, 0, 'active')

ON CONFLICT (name) DO UPDATE
  SET tier = EXCLUDED.tier;
