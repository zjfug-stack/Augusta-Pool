import { createClient } from '@/lib/supabase/server'
import type { Golfer } from '@/lib/supabase/types'
import { EntryForm } from './EntryForm'

export const metadata = { title: 'Submit Entry · Masters Pool' }

export default async function SubmitPage() {
  const supabase = await createClient()

  const [{ data: golferRows }, { data: settingsRows }] = await Promise.all([
    supabase
      .from('golfers')
      .select('id, name, tier, current_score, status')
      .order('name'),
    supabase
      .from('pool_settings')
      .select('submissions_open')
      .limit(1),
  ])

  const settings = settingsRows?.[0]
  if (!settings?.submissions_open) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">🏌️</div>
        <h1 className="text-2xl font-bold text-masters-green mb-3">
          Submissions Are Closed
        </h1>
        <p className="text-gray-600">
          The pool is no longer accepting entries. Check the{' '}
          <a href="/" className="text-masters-green font-medium underline">
            leaderboard
          </a>{' '}
          to see how everyone is doing.
        </p>
      </div>
    )
  }

  // Group golfers by tier
  const golfersByTier: Record<number, Golfer[]> = {}
  for (const g of golferRows ?? []) {
    const tier = g.tier as number
    if (!golfersByTier[tier]) golfersByTier[tier] = []
    golfersByTier[tier].push(g as Golfer)
  }

  const hasTiers = [1, 2, 3, 4, 5, 6].every((t) => (golfersByTier[t]?.length ?? 0) > 0)

  if (!hasTiers) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-5xl mb-4">⛳</div>
        <h1 className="text-2xl font-bold text-masters-green mb-3">Coming Soon</h1>
        <p className="text-gray-600">
          The field hasn&apos;t been seeded yet. Check back soon!
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-masters-green">Submit Your Entry</h1>
        <p className="text-gray-600 mt-1 text-sm">
          Pick one golfer from each tier and enter your tiebreak guess.
        </p>
      </div>
      <EntryForm golfersByTier={golfersByTier} />
    </div>
  )
}
