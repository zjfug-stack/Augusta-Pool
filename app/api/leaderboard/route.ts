import { type NextRequest, NextResponse } from 'next/server'
import { getLeaderboardData } from '@/lib/leaderboard'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))

  try {
    const data = await getLeaderboardData(page)
    return NextResponse.json(data, {
      headers: {
        // Allow SWR to cache for up to 60 s on the CDN edge
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    })
  } catch (err) {
    console.error('[/api/leaderboard] error:', err)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
