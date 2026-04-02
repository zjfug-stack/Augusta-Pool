/**
 * /api/cron/sync-scores — Vercel cron job for live score syncing.
 *
 * • Runs every 5 minutes (configured in vercel.json).
 * • Guarded by a CRON_SECRET so only Vercel's scheduler can trigger it.
 * • Respects Masters week dates (April 9–12, 2026 + 1-day buffer each side).
 * • Mirrors the logic in sync_scores.py.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchESPNLeaderboard, matchByLastName, type ESPNGolfer } from '@/lib/espn'

// Masters week 2026 — allow one extra day either side as buffer
const WINDOW_START = new Date('2026-04-08T00:00:00Z')
const WINDOW_END   = new Date('2026-04-14T23:59:59Z')

export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Date gate — bypass when ?force=1 is passed (for manual admin trigger) ─
  const force = req.nextUrl.searchParams.get('force') === '1'
  const now = new Date()
  if (!force && (now < WINDOW_START || now > WINDOW_END)) {
    return NextResponse.json({
      skipped: true,
      reason: 'Outside Masters week window',
      now: now.toISOString(),
    })
  }

  // ── Scrape ESPN ───────────────────────────────────────────────────────────
  let espnPlayers: ESPNGolfer[]
  try {
    espnPlayers = await fetchESPNLeaderboard()
  } catch (err) {
    console.error('[sync-scores] ESPN fetch error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ESPN fetch failed' },
      { status: 502 }
    )
  }

  if (!espnPlayers.length) {
    return NextResponse.json(
      { error: 'No players returned from ESPN — tournament may not be live yet.' },
      { status: 200 }
    )
  }

  // ── Fetch DB golfers ──────────────────────────────────────────────────────
  const supabase = createAdminClient()
  // Use select('*') so this works even if migration 003 hasn't been run
  // (best_round_score / best_round_num may not exist yet)
  const { data: dbGolfers, error: fetchErr } = await supabase
    .from('golfers')
    .select('*')

  if (fetchErr) {
    console.error('[sync-scores] DB fetch error:', fetchErr)
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  // ── Match + compute updates ───────────────────────────────────────────────
  let changed = 0
  const updates: Array<{ id: number; patch: Record<string, unknown> }> = []

  for (const db of dbGolfers ?? []) {
    // Cut players: score is frozen — never overwrite
    if (db.status === 'cut') continue

    const espn = matchByLastName(db.name, espnPlayers)
    if (!espn) continue

    const patch: Record<string, unknown> = {}

    if (espn.status === 'cut' || espn.status === 'wd' || espn.status === 'dq') {
      // Status change only — score stays where it was
      if (espn.status !== db.status) {
        patch.status = espn.status
      }
    } else {
      // Active player — update score and status
      if (espn.score !== db.current_score) patch.current_score = espn.score
      if (espn.status !== db.status) patch.status = espn.status
      if (
        espn.bestRoundScore !== null &&
        (espn.bestRoundScore !== db.best_round_score ||
          espn.bestRoundNum !== db.best_round_num)
      ) {
        patch.best_round_score = espn.bestRoundScore
        patch.best_round_num = espn.bestRoundNum
      }
    }

    if (Object.keys(patch).length > 0) {
      updates.push({ id: db.id, patch })
      changed++
    }
  }

  // Apply updates
  for (const { id, patch } of updates) {
    await supabase.from('golfers').update(patch).eq('id', id)
  }

  // ── Compute round low label ───────────────────────────────────────────────
  const withBest = espnPlayers.filter((p) => p.bestRoundScore !== null)
  let roundLowLabel: string | null = null

  if (withBest.length) {
    const best = withBest.reduce((a, b) =>
      (a.bestRoundScore ?? 0) <= (b.bestRoundScore ?? 0) ? a : b
    )
    const scoreStr =
      best.bestRoundScore === 0
        ? 'E'
        : (best.bestRoundScore ?? 0) > 0
          ? `+${best.bestRoundScore}`
          : String(best.bestRoundScore)

    // Count pool entries that picked this golfer
    const { data: golferRow } = await supabase
      .from('golfers')
      .select('id')
      .eq('name', best.name)
      .limit(1)
    const golferId = golferRow?.[0]?.id

    let entryCount = 0
    if (golferId) {
      const { count } = await supabase
        .from('entries')
        .select('id', { count: 'exact', head: true })
        .or(
          [1, 2, 3, 4, 5, 6]
            .map((t) => `tier${t}_golfer_id.eq.${golferId}`)
            .join(',')
        )
      entryCount = count ?? 0
    }

    roundLowLabel = `${best.name} ${scoreStr} (R${best.bestRoundNum})`
    if (entryCount > 0) {
      roundLowLabel += ` · ${entryCount} ${entryCount === 1 ? 'entry' : 'entries'}`
    }
  }

  // ── Auto-detect tournament completion ─────────────────────────────────────
  // Tournament is complete when ESPN shows no active in-progress players
  const activeESPN = espnPlayers.filter((p) => p.status === 'active')
  let winnerScore: number | null = null

  if (activeESPN.length === 0 && espnPlayers.length > 0) {
    // All players finished — find the leader among non-cut/wd/dq
    const finishers = espnPlayers
      .filter((p) => p.status !== 'cut' && p.status !== 'wd' && p.status !== 'dq')
      .sort((a, b) => a.score - b.score)
    if (finishers.length > 0) {
      winnerScore = finishers[0].score
    }
  }

  // ── Update pool_settings ──────────────────────────────────────────────────
  const settingsPatch: Record<string, unknown> = {
    last_synced_at: now.toISOString(),
  }
  if (roundLowLabel !== null) settingsPatch.round_low_label = roundLowLabel
  if (winnerScore !== null) settingsPatch.winner_score = winnerScore

  await supabase.from('pool_settings').update(settingsPatch).eq('id', 1)

  console.log(
    `[sync-scores] ${now.toISOString()} — ${changed} changed, ` +
      `${espnPlayers.length} ESPN players, ` +
      `tournament_complete=${winnerScore !== null}`
  )

  return NextResponse.json({
    ok: true,
    changed,
    total: espnPlayers.length,
    roundLowLabel,
    winnerScore,
    syncedAt: now.toISOString(),
  })
}
