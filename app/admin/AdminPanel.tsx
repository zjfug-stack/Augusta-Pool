'use client'

import { useState, useTransition } from 'react'
import type { Golfer, PoolSettings } from '@/lib/supabase/types'
import { updateGolfer, updatePoolSettings } from './actions'
import { formatScore } from '@/lib/scoring'

// ─── Pool settings section ────────────────────────────────────────────────────

function PoolSettingsCard({ settings }: { settings: PoolSettings }) {
  const [open, setOpen] = useState(settings.submissions_open)
  const [winnerScore, setWinnerScore] = useState(
    settings.winner_score?.toString() ?? ''
  )
  const [roundLow, setRoundLow] = useState(settings.round_low_label ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await updatePoolSettings({
        submissions_open: open,
        winner_score: winnerScore !== '' ? parseInt(winnerScore) : null,
        round_low_label: roundLow.trim() || null,
      })
      if (res.error) {
        setError(res.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm mb-6">
      <h2 className="text-base font-bold text-masters-green mb-4">Pool Settings</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Submissions toggle */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Submissions
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setOpen(true)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                open
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setOpen(false)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                !open
                  ? 'bg-red-500 text-white border-red-500'
                  : 'border-gray-300 text-gray-600 hover:border-gray-400'
              }`}
            >
              Closed
            </button>
          </div>
        </div>

        {/* Winner score */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Official Winner Score (to par)
          </label>
          <input
            type="number"
            value={winnerScore}
            onChange={(e) => setWinnerScore(e.target.value)}
            placeholder="e.g. -12"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
          />
        </div>

        {/* Round low */}
        <div className="sm:col-span-2">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
            Round Low Banner Text
          </label>
          <input
            type="text"
            value={roundLow}
            onChange={(e) => setRoundLow(e.target.value)}
            placeholder='e.g. Tiger Woods −8 (Round 2)'
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
          />
          <p className="text-xs text-gray-400 mt-1">Leave blank to hide the banner.</p>
        </div>
      </div>

      {error && (
        <p className="text-red-600 text-sm mt-3">{error}</p>
      )}

      <button
        onClick={handleSave}
        disabled={isPending}
        className="mt-4 px-6 py-2 bg-masters-green text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  )
}

// ─── Golfer row ───────────────────────────────────────────────────────────────

function GolferRow({ golfer }: { golfer: Golfer }) {
  const [score, setScore] = useState(golfer.current_score)
  const [status, setStatus] = useState(golfer.status)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty =
    score !== golfer.current_score || status !== golfer.status

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await updateGolfer(golfer.id, score, status)
      if (res.error) {
        setError(res.error)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    })
  }

  const tierColors: Record<number, string> = {
    1: 'bg-purple-100 text-purple-700',
    2: 'bg-blue-100 text-blue-700',
    3: 'bg-cyan-100 text-cyan-700',
    4: 'bg-teal-100 text-teal-700',
    5: 'bg-orange-100 text-orange-700',
    6: 'bg-gray-100 text-gray-700',
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
      {/* Name */}
      <td className="py-2.5 px-3 text-sm font-medium text-gray-800">{golfer.name}</td>

      {/* Tier */}
      <td className="py-2.5 px-3">
        <span
          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            tierColors[golfer.tier] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          T{golfer.tier}
        </span>
      </td>

      {/* Score */}
      <td className="py-2.5 px-3">
        <input
          type="number"
          value={score}
          onChange={(e) => { setScore(parseInt(e.target.value) || 0); setSaved(false) }}
          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-masters-green/50 tabular-nums"
        />
      </td>

      {/* Status */}
      <td className="py-2.5 px-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as Golfer['status']); setSaved(false) }}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-masters-green/50"
        >
          <option value="active">Active</option>
          <option value="cut">Cut</option>
          <option value="wd">WD</option>
          <option value="dq">DQ</option>
        </select>
      </td>

      {/* Action */}
      <td className="py-2.5 px-3 text-right">
        {error && <span className="text-red-500 text-xs mr-2">{error}</span>}
        <button
          onClick={handleSave}
          disabled={isPending || !isDirty}
          className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
            saved
              ? 'bg-green-100 text-green-700'
              : isDirty
                ? 'bg-masters-green text-white hover:opacity-90'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AdminPanel({
  golfers,
  poolSettings,
}: {
  golfers: Golfer[]
  poolSettings: PoolSettings
}) {
  const tiers = [1, 2, 3, 4, 5, 6]

  return (
    <div className="space-y-6">
      <PoolSettingsCard settings={poolSettings} />

      {golfers.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500 text-sm mb-2">No golfers in the database yet.</p>
          <p className="text-xs text-gray-400">
            Run the seed script (Prompt 6) to populate the field, then refresh.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-masters-green">Golfers</h2>
            <span className="text-xs text-gray-400">{golfers.length} players</span>
          </div>

          {tiers.map((tier) => {
            const tierGolfers = golfers.filter((g) => g.tier === tier)
            if (!tierGolfers.length) return null
            return (
              <div key={tier}>
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Tier {tier} — {tierGolfers.length} players
                  </h3>
                </div>
                <table className="w-full">
                  <colgroup>
                    <col className="w-auto" />
                    <col className="w-12" />
                    <col className="w-24" />
                    <col className="w-28" />
                    <col className="w-20" />
                  </colgroup>
                  <tbody>
                    {tierGolfers.map((g) => (
                      <GolferRow key={g.id} golfer={g} />
                    ))}
                  </tbody>
                </table>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
