# Deploying to Vercel

## Step 1 — Push the repo to GitHub

If you haven't already, create a GitHub repo and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/masters-pool.git
git push -u origin main
```

---

## Step 2 — Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in (use "Continue with GitHub").
2. Click **"Add New… → Project"**.
3. Find your `masters-pool` repo and click **Import**.
4. Vercel detects Next.js automatically — leave the build settings as-is.
5. **Before clicking Deploy**, expand **"Environment Variables"** and add the
   following (copy values from your Supabase dashboard):

| Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your `anon` key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | your `service_role` key | Production, Preview, Development |
| `ADMIN_PASSWORD` | your chosen password | Production, Preview, Development |

> **Where to find these in Supabase:**
> Dashboard → your project → **Settings → API**

6. Click **Deploy**. Vercel will build and deploy (~1–2 minutes).
7. Once done, Vercel gives you a URL like `https://masters-pool-xxx.vercel.app`.

---

## Step 3 — Run the database migrations

You only do this once, before the pool opens.

1. Go to your **Supabase dashboard → SQL Editor**.
2. Run `supabase/migrations/001_initial_schema.sql` (creates all tables + RLS).
3. Run `supabase/migrations/002_pool_settings_round_low.sql` (adds `round_low_label`).

---

## Step 4 — Seed the golfers field

Once you have the Masters field (closer to tournament week), you have two options:

### Option A — Manual SQL seed

Paste into the Supabase SQL Editor:

```sql
INSERT INTO golfers (name, tier) VALUES
  -- Tier 1 (Rank 1-5)
  ('Scottie Scheffler', 1),
  ('Rory McIlroy',      1),
  -- Tier 2 (Rank 6-15)
  ('Jon Rahm',          2),
  ('Xander Schauffele', 2),
  -- ... continue for all 6 tiers
  ;
```

### Option B — Python seed script (Prompt 6)

Run `seed_field.py` (coming in a future prompt) which pulls the field
automatically from the DataGolf API and assigns tiers by OWGR rank.

**Preview before writing:**
```bash
python seed_field.py --dry-run
```

**Write to DB:**
```bash
python seed_field.py
```

---

## Step 5 — Open submissions

1. Visit `https://your-site.vercel.app/admin`.
2. Log in with your `ADMIN_PASSWORD`.
3. Under **Pool Settings**, confirm **Submissions = Open**.
4. Share the `/submit` link with your pool participants.

---

## Step 6 — Close submissions & run the tournament

1. Before the first tee shot on Thursday morning, go to `/admin` and set
   **Submissions = Closed**.
2. During the tournament, scores update automatically every 3 minutes
   (via the `revalidate = 180` setting on the leaderboard page).
   Once Prompt 7 (live score sync) is set up, a Vercel cron job will push
   real-time scores directly into Supabase every 5 minutes.
3. After the tournament ends, set the **Official Winner Score** in `/admin`
   to unlock tiebreak sorting.

---

## Updating environment variables later

If you need to change a variable after deploy:

1. Vercel Dashboard → your project → **Settings → Environment Variables**.
2. Edit the value and click **Save**.
3. Go to **Deployments** and **Redeploy** the latest build to pick up the change.

---

## Custom domain (optional)

1. Vercel Dashboard → your project → **Settings → Domains**.
2. Add your domain (e.g. `masterpool.yourdomain.com`).
3. Follow the DNS instructions Vercel shows you.
