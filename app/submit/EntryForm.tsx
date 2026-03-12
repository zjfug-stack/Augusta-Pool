'use client'

import { useActionState } from 'react'
import type { Golfer } from '@/lib/supabase/types'
import { submitEntry, type SubmitState } from './actions'

const TIER_LABELS: Record<number, string> = {
  1: 'Tier 1 — Favorites (Rank 1–5)',
  2: 'Tier 2 — Contenders (Rank 6–15)',
  3: 'Tier 3 — Dark Horses (Rank 16–30)',
  4: 'Tier 4 — Longshots (Rank 31–50)',
  5: 'Tier 5 — Sleepers (Rank 51–75)',
  6: 'Tier 6 — Field (Rank 76+)',
}

const initialState: SubmitState = { success: false }

export function EntryForm({
  golfersByTier,
}: {
  golfersByTier: Record<number, Golfer[]>
}) {
  const [state, formAction, isPending] = useActionState(submitEntry, initialState)

  if (state.success) {
    return (
      <div className="bg-white rounded-xl border border-masters-green/30 p-8 text-center shadow-sm">
        <div className="text-5xl mb-4">🏆</div>
        <h2 className="text-xl font-bold text-masters-green mb-2">
          Entry Submitted!
        </h2>
        <p className="text-gray-600 mb-6">
          Good luck! Check the leaderboard once the tournament begins.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="/"
            className="px-5 py-2 bg-masters-green text-white rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
          >
            View Leaderboard
          </a>
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2 border border-masters-green text-masters-green rounded-full text-sm font-medium hover:bg-masters-green/5 transition-colors"
          >
            Submit Another Entry
          </button>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Entrant name */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="entrant_name"
          required
          placeholder="e.g. John Smith"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50 focus:border-masters-green"
        />
      </div>

      {/* Tier selects */}
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((tier) => (
          <div
            key={tier}
            className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm"
          >
            <label className="block text-sm font-semibold text-gray-700 mb-0.5">
              {TIER_LABELS[tier]} <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {golfersByTier[tier]?.length ?? 0} golfers available
            </p>
            <select
              name={`tier${tier}_golfer_id`}
              required
              defaultValue=""
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-masters-green/50 focus:border-masters-green"
            >
              <option value="" disabled>
                — Select a golfer —
              </option>
              {(golfersByTier[tier] ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Tiebreak */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-1">
          Tiebreak Guess <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-2">
          What will the winner&apos;s final score to par be? Enter as a negative
          number (e.g. <strong>-12</strong> for 12 under).
        </p>
        <input
          type="number"
          name="tiebreak_guess"
          required
          placeholder="-12"
          className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50 focus:border-masters-green"
        />
      </div>

      {/* Error */}
      {state.error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {state.error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full py-3 bg-masters-green text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm shadow-sm"
      >
        {isPending ? 'Submitting…' : 'Submit Entry'}
      </button>

      <p className="text-xs text-gray-400 text-center">
        Each entry is final once submitted. Entries close before the first tee shot Thursday.
      </p>
    </form>
  )
}
