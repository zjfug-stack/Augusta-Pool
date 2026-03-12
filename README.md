# Masters Pool

A Next.js + Supabase app for running a Masters Tournament golf pool.

---

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router, TypeScript)
- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres database)

---

## Getting Started

### 1. Clone & install dependencies

```bash
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com/dashboard).
2. Open **SQL Editor** in your project dashboard.
3. Paste and run the contents of [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql).

### 3. Configure environment variables

Copy the example env file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

Then open `.env.local` and set:

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → `service_role` key *(optional, server-only admin use)* |

> **Never** commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY` to the browser.

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Database Schema

### `golfers`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated PK |
| `name` | text | Golfer's full name |
| `tier` | smallint | 1–6 |
| `current_score` | integer | Defaults to 0 (even par) |
| `status` | enum | `active` \| `cut` \| `wd` \| `dq` |

### `entries`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated PK |
| `entrant_name` | text | Pool participant's name |
| `tier1_golfer_id` | bigint | FK → `golfers.id` |
| `tier2_golfer_id` | bigint | FK → `golfers.id` |
| `tier3_golfer_id` | bigint | FK → `golfers.id` |
| `tier4_golfer_id` | bigint | FK → `golfers.id` |
| `tier5_golfer_id` | bigint | FK → `golfers.id` |
| `tier6_golfer_id` | bigint | FK → `golfers.id` |
| `tiebreak_guess` | integer | Winning score guess |
| `created_at` | timestamptz | Auto-set on insert |

### `pool_settings`

| Column | Type | Notes |
|---|---|---|
| `id` | bigint | Auto-generated PK |
| `submissions_open` | boolean | Defaults to `true` |
| `winner_score` | integer | Null until tournament ends |

---

## Project Structure

```
├── app/                  # Next.js App Router pages & layouts
├── lib/
│   └── supabase/
│       ├── client.ts     # Browser-side Supabase client
│       ├── server.ts     # Server-side Supabase client (SSR)
│       └── types.ts      # TypeScript interfaces for DB tables
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── .env.local.example    # Environment variable template
└── ...
```
