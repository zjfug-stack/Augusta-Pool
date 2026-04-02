/**
 * /api/cron/sync-public — auth-free score sync for GitHub Actions.
 *
 * No secret required. Protected by:
 *   1. Date gate: only runs April 7–15 2026
 *   2. Rate limit: skips if last sync was < 4 minutes ago
 *
 * Called by .github/workflows/sync-scores.yml every 5 minutes.
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchESPNLeaderboard, matchByLastName } from '@/lib/espn'

const WINDOW_START = new Date('2026-04-07T00:00:00Z')
const WINDOW_END   = new Date('2026-04-15T23:59:59Z')
const MIN_INTERVAL_MS = 4 * 60 * 1000   // 4 minutes

export async function GET() {
  const now = new Date()

  // ── Date gate ─────────────────────────────────────────────────────────────
  if (now < WINDOW_START || now > WINDOW_END) {
    return NextResponse.json({
      skipped: true,
      reason: 'Outside Masters week (April 7–15)',
      now: now.toISOString(),
    })
  }

  const supabase = createAdminClient()

  // ── Rate limit via last_synced_at ──────────────────────────────────────────
  const { data: settings } = await supabase
    .from('pool_settings')
    .select('last_synced_at')
    .limit(1)
    .single()

  if (settings?.last_synced_at) {
    const elapsed = now.getTime() - new Date(settings.last_synced_at).getTime()
    if (elapsed < MIN_INTERVAL_MS) {
      return NextResponse.json({
        skipped: true,
        reason: `Last sync was ${Math.round(elapsed / 1000)}s ago — rate limited`,
      })
    }
  }

  // ── Scrape ESPN ───────────────────────────────────────────────────────────
  let espnPlayers
  try {
    espnPlayers = await fetchESPNLeaderboard()
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'ESPN fetch failed' },
      { status: 502 }
    )
  }

  if (!espnPlayers.length) {
    return NextResponse.json({ error: 'No players from ESPN yet' }, { status: 200 })
  }

  // ── Fetch DB golfers ───────────────────────────────────────────────────────
  const { data: dbGolfers, error: fetchErr } = await supabase
    .from('golfers')
    .select('*')

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 })
  }

  // ── Match + update ─────────────────────────────────────────────────────────
  let changed = 0
  for (const db of dbGolfers ?? []) {
    if (db.status === 'cut') continue
    const espn = matchByLastName(db.name, espnPlayers)
    if (!espn) continue

    const patch: Record<string, unknown> = {}
    if (espn.status === 'cut' || espn.status === 'wd' || espn.status === 'dq') {
      if (espn.status !== db.status) patch.status = espn.status
    } else {
      if (espn.score !== db.current_score) patch.current_score = espn.score
      if (espn.status !== db.status) patch.status = espn.status
      if (espn.bestRoundScore !== null && espn.bestRoundScore !== db.best_round_score) {
        patch.best_round_score = espn.bestRoundScore
        patch.best_round_num = espn.bestRoundNum
      }
    }
    if (Object.keys(patch).length > 0) {
      await supabase.from('golfers').update(patch).eq('id', db.id)
      changed++
    }
  }

  // ── Round low label ────────────────────────────────────────────────────────
  const withBest = espnPlayers.filter((p) => p.bestRoundScore !== null)
  let roundLowLabel: string | null = null
  if (withBest.length) {
    const best = withBest.reduce((a, b) =>
      (a.bestRoundScore ?? 0) <= (b.bestRoundScore ?? 0) ? a : b
    )
    const sc = best.bestRoundScore === 0 ? 'E'
      : (best.bestRoundScore ?? 0) > 0 ? `+${best.bestRoundScore}`
      : String(best.bestRoundScore)
    roundLowLabel = `${best.name} ${sc} (R${best.bestRoundNum})`
  }

  // ── Tournament complete ────────────────────────────────────────────────────
  const active = espnPlayers.filter((p) => p.status === 'active')
  let winnerScore: number | null = null
  if (active.length === 0 && espnPlayers.length > 0) {
    const finishers = espnPlayers
      .filter((p) => p.status !== 'cut' && p.status !== 'wd' && p.status !== 'dq')
      .sort((a, b) => a.score - b.score)
    if (finishers.length) winnerScore = finishers[0].score
  }

  // ── Update pool_settings ───────────────────────────────────────────────────
  const patch: Record<string, unknown> = { last_synced_at: now.toISOString() }
  if (roundLowLabel) patch.round_low_label = roundLowLabel
  if (winnerScore !== null) patch.winner_score = winnerScore
  await supabase.from('pool_settings').update(patch).eq('id', 1)

  return NextResponse.json({
    ok: true,
    changed,
    total: espnPlayers.length,
    roundLowLabel,
    winnerScore,
    syncedAt: now.toISOString(),
  })
}
