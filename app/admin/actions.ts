'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// ─── Auth helpers ────────────────────────────────────────────────────────────

export async function loginAdmin(formData: FormData) {
  const password = formData.get('password') as string
  if (password === process.env.ADMIN_PASSWORD) {
    const jar = await cookies()
    jar.set('admin_auth', password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24, // 24 h
    })
  }
  redirect('/admin')
}

export async function logoutAdmin() {
  const jar = await cookies()
  jar.delete('admin_auth')
  redirect('/admin')
}

async function requireAdmin() {
  const jar = await cookies()
  if (jar.get('admin_auth')?.value !== process.env.ADMIN_PASSWORD) {
    redirect('/admin')
  }
}

// ─── Golfer mutations ────────────────────────────────────────────────────────

export async function updateGolfer(
  id: number,
  score: number,
  status: string
): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('golfers')
    .update({ current_score: score, status })
    .eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return {}
}

// ─── Manual score sync ───────────────────────────────────────────────────────

export async function triggerScoreSync(): Promise<{
  error?: string
  changed?: number
  total?: number
  skipped?: boolean
  reason?: string
}> {
  await requireAdmin()
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return { error: 'CRON_SECRET env var is not set' }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000'

  try {
    const res = await fetch(`${baseUrl}/api/cron/sync-scores?force=1`, {
      headers: { Authorization: `Bearer ${cronSecret}` },
      cache: 'no-store',
    })
    const json = await res.json()
    if (!res.ok) return { error: json.error ?? `HTTP ${res.status}` }
    return json
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Fetch failed' }
  }
}

// ─── Field seeding ───────────────────────────────────────────────────────────

const MASTERS_2026_FIELD: { name: string; tier: 1 | 2 | 3 | 4 | 5 | 6 }[] = [
  // Tier 1 — Rank 1–5
  { name: 'Scottie Scheffler',     tier: 1 },
  { name: 'Rory McIlroy',          tier: 1 },
  { name: 'Xander Schauffele',     tier: 1 },
  { name: 'Viktor Hovland',        tier: 1 },
  { name: 'Jon Rahm',              tier: 1 },
  // Tier 2 — Rank 6–15
  { name: 'Collin Morikawa',       tier: 2 },
  { name: 'Patrick Cantlay',       tier: 2 },
  { name: 'Tommy Fleetwood',       tier: 2 },
  { name: 'Hideki Matsuyama',      tier: 2 },
  { name: 'Justin Thomas',         tier: 2 },
  { name: 'Shane Lowry',           tier: 2 },
  { name: 'Matt Fitzpatrick',      tier: 2 },
  { name: 'Tony Finau',            tier: 2 },
  { name: 'Keegan Bradley',        tier: 2 },
  { name: 'Brian Harman',          tier: 2 },
  // Tier 3 — Rank 16–30
  { name: 'Jordan Spieth',         tier: 3 },
  { name: 'Wyndham Clark',         tier: 3 },
  { name: 'Sahith Theegala',       tier: 3 },
  { name: 'Sam Burns',             tier: 3 },
  { name: 'Will Zalatoris',        tier: 3 },
  { name: 'Tom Kim',               tier: 3 },
  { name: 'Russell Henley',        tier: 3 },
  { name: 'Corey Conners',         tier: 3 },
  { name: 'Seamus Power',          tier: 3 },
  { name: 'Lucas Glover',          tier: 3 },
  { name: 'Jason Day',             tier: 3 },
  { name: 'Adam Scott',            tier: 3 },
  { name: 'Max Homa',              tier: 3 },
  { name: 'Tyrrell Hatton',        tier: 3 },
  { name: 'Sungjae Im',            tier: 3 },
  // Tier 4 — Rank 31–50
  { name: 'Dustin Johnson',        tier: 4 },
  { name: 'Brooks Koepka',         tier: 4 },
  { name: 'Si Woo Kim',            tier: 4 },
  { name: 'Tom Hoge',              tier: 4 },
  { name: 'Nick Taylor',           tier: 4 },
  { name: 'Byeong Hun An',         tier: 4 },
  { name: 'Austin Eckroat',        tier: 4 },
  { name: 'Eric Cole',             tier: 4 },
  { name: 'Denny McCarthy',        tier: 4 },
  { name: 'Davis Thompson',        tier: 4 },
  { name: 'Justin Rose',           tier: 4 },
  { name: 'Chris Kirk',            tier: 4 },
  { name: 'Danny Willett',         tier: 4 },
  { name: 'Camilo Villegas',       tier: 4 },
  { name: 'Chez Reavie',           tier: 4 },
  // Tier 5 — Rank 51–75
  { name: 'Rickie Fowler',         tier: 5 },
  { name: 'Cameron Young',         tier: 5 },
  { name: 'Min Woo Lee',           tier: 5 },
  { name: 'Christiaan Bezuidenhout', tier: 5 },
  { name: 'Alex Noren',            tier: 5 },
  { name: 'Bubba Watson',          tier: 5 },
  { name: 'Zach Johnson',          tier: 5 },
  { name: 'Louis Oosthuizen',      tier: 5 },
  { name: 'Charl Schwartzel',      tier: 5 },
  { name: 'Patrick Reed',          tier: 5 },
  { name: 'Sergio Garcia',         tier: 5 },
  { name: 'Jason Kokrak',          tier: 5 },
  { name: 'Cam Davis',             tier: 5 },
  { name: 'Victor Perez',          tier: 5 },
  { name: 'Haotong Li',            tier: 5 },
  // Tier 6 — Past champions & other qualifiers
  { name: 'Tiger Woods',           tier: 6 },
  { name: 'Phil Mickelson',        tier: 6 },
  { name: 'Fred Couples',          tier: 6 },
  { name: 'Jose Maria Olazabal',   tier: 6 },
  { name: 'Mike Weir',             tier: 6 },
  { name: 'Sandy Lyle',            tier: 6 },
  { name: 'Larry Mize',            tier: 6 },
  { name: 'Bernhard Langer',       tier: 6 },
  { name: 'Nick Faldo',            tier: 6 },
  { name: 'Ian Woosnam',           tier: 6 },
  { name: 'Fuzzy Zoeller',         tier: 6 },
  { name: 'Ben Crenshaw',          tier: 6 },
  { name: "Mark O'Meara",          tier: 6 },
  { name: 'Trevor Immelman',       tier: 6 },
  { name: 'Vijay Singh',           tier: 6 },
]

export async function seedField(): Promise<{ error?: string; count?: number }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const rows = MASTERS_2026_FIELD.map((g) => ({
    ...g,
    current_score: 0,
    status: 'active' as const,
  }))
  const { error, count } = await supabase
    .from('golfers')
    .upsert(rows, { onConflict: 'name', count: 'exact' })

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  revalidatePath('/submit')
  return { count: count ?? rows.length }
}

// ─── Pool settings mutations ─────────────────────────────────────────────────

export async function updatePoolSettings(data: {
  submissions_open?: boolean
  winner_score?: number | null
  round_low_label?: string | null
}): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('pool_settings').update(data).eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return {}
}

export async function updateRulesConfig(data: {
  venmo_handle: string
  entry_fee: number
  submission_deadline: string
}): Promise<{ error?: string }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error } = await supabase.from('pool_settings').update(data).eq('id', 1)

  if (error) return { error: error.message }
  revalidatePath('/rules')
  revalidatePath('/admin')
  return {}
}

// ─── Score reset ─────────────────────────────────────────────────────────────

export async function resetAllScores(): Promise<{ error?: string; count?: number }> {
  await requireAdmin()
  const supabase = createAdminClient()
  const { error, data } = await supabase
    .from('golfers')
    .update({ current_score: 0, status: 'active', best_round_score: null, best_round_num: null })
    .neq('id', 0)  // matches all rows
    .select('id')

  if (error) return { error: error.message }
  revalidatePath('/')
  revalidatePath('/admin')
  return { count: data?.length ?? 0 }
}
