/**
 * lib/leaderboard.ts — shared leaderboard data fetcher.
 * Used by both the server component (app/page.tsx) and the
 * API route (app/api/leaderboard/route.ts) to ensure consistent results.
 */

import { createClient } from '@/lib/supabase/server'
import { buildScoredEntries, type GolferRef, type EntryRow, type ScoredEntry } from './scoring'

export const PER_PAGE = 50

export type LeaderboardData = {
  entries: ScoredEntry[]
  totalEntries: number
  totalPages: number
  currentPage: number
  winnerScore: number | null
  roundLowLabel: string | null
  lastSyncedAt: string | null
  submissionsOpen: boolean
}

const EMPTY_DATA = (page: number): LeaderboardData => ({
  entries: [],
  totalEntries: 0,
  totalPages: 1,
  currentPage: page,
  winnerScore: null,
  roundLowLabel: null,
  lastSyncedAt: null,
  submissionsOpen: true,
})

export async function getLeaderboardData(page: number): Promise<LeaderboardData> {
  try {
    const supabase = await createClient()

    const [{ data: golferRows, error: gErr }, { data: entryRows, error: eErr }, { data: settingsRows, error: sErr }] =
      await Promise.all([
        supabase.from('golfers').select('id, name, tier, current_score, status'),
        supabase
          .from('entries')
          .select(
            'id, entrant_name, tier1_golfer_id, tier2_golfer_id, tier3_golfer_id, ' +
              'tier4_golfer_id, tier5_golfer_id, tier6_golfer_id, tiebreak_guess, created_at'
          ),
        // Use select('*') so that missing columns from pending migrations don't cause errors
        supabase.from('pool_settings').select('*').limit(1),
      ])

    if (gErr) console.error('[leaderboard] golfers error:', gErr.message)
    if (eErr) console.error('[leaderboard] entries error:', eErr.message)
    if (sErr) console.error('[leaderboard] pool_settings error:', sErr.message)

    const settings = settingsRows?.[0] ?? null

    const golferMap = new Map<number, GolferRef>(
      (golferRows ?? []).map((g) => [g.id, g as GolferRef])
    )

    const scored = buildScoredEntries(
      (entryRows ?? []) as unknown as EntryRow[],
      golferMap,
      settings?.winner_score ?? null
    )

    const totalEntries = scored.length
    const totalPages = Math.max(1, Math.ceil(totalEntries / PER_PAGE))
    const safePage = Math.min(Math.max(1, page), totalPages)

    return {
      entries: scored.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
      totalEntries,
      totalPages,
      currentPage: safePage,
      winnerScore: settings?.winner_score ?? null,
      roundLowLabel: settings?.round_low_label ?? null,
      lastSyncedAt: settings?.last_synced_at ?? null,
      submissionsOpen: settings?.submissions_open ?? true,
    }
  } catch (err) {
    console.error('[leaderboard] unexpected error:', err)
    return EMPTY_DATA(page)
  }
}
