import { createClient } from '@/lib/supabase/server'
import { buildScoredEntries, type GolferRef, type EntryRow } from '@/lib/scoring'
import { LeaderboardTable } from './LeaderboardTable'
import Link from 'next/link'

export const metadata = { title: 'Leaderboard · Masters Pool' }
// Revalidate every 3 minutes (180 s) so scores stay reasonably fresh
export const revalidate = 180

const PER_PAGE = 50

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))

  const supabase = await createClient()

  const [{ data: golferRows }, { data: entryRows }, { data: settingsRows }] =
    await Promise.all([
      supabase
        .from('golfers')
        .select('id, name, tier, current_score, status'),
      supabase
        .from('entries')
        .select(
          'id, entrant_name, tier1_golfer_id, tier2_golfer_id, tier3_golfer_id, tier4_golfer_id, tier5_golfer_id, tier6_golfer_id, tiebreak_guess, created_at'
        ),
      supabase
        .from('pool_settings')
        .select('winner_score, round_low_label, submissions_open')
        .limit(1),
    ])

  const settings = settingsRows?.[0] ?? null
  const winnerScore: number | null = settings?.winner_score ?? null
  const roundLowLabel: string | null = settings?.round_low_label ?? null

  // Build a golfer lookup map
  const golferMap = new Map<number, GolferRef>(
    (golferRows ?? []).map((g) => [g.id, g as GolferRef])
  )

  // Score + sort all entries
  const scored = buildScoredEntries(
    (entryRows ?? []) as EntryRow[],
    golferMap,
    winnerScore
  )

  const totalEntries = scored.length
  const totalPages = Math.max(1, Math.ceil(totalEntries / PER_PAGE))
  const safePage = Math.min(currentPage, totalPages)
  const pageEntries = scored.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <div>
      {/* Page header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-masters-green">Leaderboard</h1>
          {winnerScore !== null && (
            <p className="text-sm text-gray-500 mt-0.5">
              Official winner score: <strong>{winnerScore > 0 ? `+${winnerScore}` : winnerScore}</strong>
            </p>
          )}
        </div>
        {settings?.submissions_open && (
          <Link
            href="/submit"
            className="inline-block self-start sm:self-auto px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
          >
            Submit Entry →
          </Link>
        )}
      </div>

      {/* Round Low banner */}
      {roundLowLabel && (
        <div className="mb-4 flex items-center gap-2 bg-masters-gold text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm">
          <span className="text-base">🦅</span>
          <span>Round Low: {roundLowLabel}</span>
        </div>
      )}

      {/* Empty state */}
      {totalEntries === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <div className="text-5xl mb-4">⛳</div>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No entries yet</h2>
          <p className="text-gray-500 text-sm mb-6">Be the first to pick your team!</p>
          <Link
            href="/submit"
            className="px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
          >
            Submit Entry
          </Link>
        </div>
      ) : (
        <LeaderboardTable
          entries={pageEntries}
          totalEntries={totalEntries}
          currentPage={safePage}
          totalPages={totalPages}
        />
      )}
    </div>
  )
}
