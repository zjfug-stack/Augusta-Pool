import { getLeaderboardData } from '@/lib/leaderboard'
import { LeaderboardTable } from './LeaderboardTable'
import Link from 'next/link'

export const metadata = { title: 'Leaderboard · Masters Pool' }
// Server-side ISR — baseline fresh data every 3 minutes even without SWR
export const revalidate = 180

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10))

  const data = await getLeaderboardData(page)

  return (
    <div>
      {/* Header bar */}
      <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-masters-green">Leaderboard</h1>
          {data.winnerScore !== null && (
            <p className="text-sm text-gray-500 mt-0.5">
              Official winner score:{' '}
              <strong>
                {data.winnerScore === 0
                  ? 'E'
                  : data.winnerScore > 0
                    ? `+${data.winnerScore}`
                    : data.winnerScore}
              </strong>
            </p>
          )}
        </div>
        {data.submissionsOpen && (
          <Link
            href="/submit"
            className="self-start sm:self-auto px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-full hover:opacity-90 transition-opacity"
          >
            Submit Entry →
          </Link>
        )}
      </div>

      {/* Empty state */}
      {data.totalEntries === 0 ? (
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
        <LeaderboardTable initialData={data} />
      )}
    </div>
  )
}
