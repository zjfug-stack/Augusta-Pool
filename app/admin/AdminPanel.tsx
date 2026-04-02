'use client'

import { useState, useTransition } from 'react'
import type { Golfer, PoolSettings } from '@/lib/supabase/types'
import {
  updateGolfer,
  updatePoolSettings,
  updateRulesConfig,
  seedField,
  triggerScoreSync,
  resetAllScores,
} from './actions'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never'
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
}

// ─── Status dashboard ─────────────────────────────────────────────────────────

function StatusDashboard({
  settings,
  entryCount,
  golferCount,
  onToggleSubmissions,
  isTogglingSubmissions,
}: {
  settings: PoolSettings
  entryCount: number
  golferCount: number
  onToggleSubmissions: () => void
  isTogglingSubmissions: boolean
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-5">
      {/* Submissions toggle — primary action */}
      <div
        className={`col-span-2 rounded-xl border p-4 flex items-center justify-between ${
          settings.submissions_open
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}
      >
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
            Submissions
          </p>
          <p
            className={`text-lg font-bold ${
              settings.submissions_open ? 'text-green-700' : 'text-red-600'
            }`}
          >
            {settings.submissions_open ? 'Open' : 'Closed'}
          </p>
        </div>
        <button
          onClick={onToggleSubmissions}
          disabled={isTogglingSubmissions}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 ${
            settings.submissions_open
              ? 'bg-red-500 text-white hover:bg-red-600'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isTogglingSubmissions
            ? '…'
            : settings.submissions_open
              ? 'Close'
              : 'Open'}
        </button>
      </div>

      {/* Entries */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
          Entries
        </p>
        <p className="text-2xl font-bold text-masters-green">{entryCount}</p>
      </div>

      {/* Field */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
          Field
        </p>
        <p className="text-2xl font-bold text-masters-green">{golferCount}</p>
        <p className="text-xs text-gray-400">golfers</p>
      </div>
    </div>
  )
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions({
  settings,
  golferCount,
}: {
  settings: PoolSettings
  golferCount: number
}) {
  const [syncPending, startSync] = useTransition()
  const [seedPending, startSeed] = useTransition()
  const [resetPending, startReset] = useTransition()
  const [syncResult, setSyncResult] = useState<string | null>(null)
  const [seedResult, setSeedResult] = useState<string | null>(null)
  const [resetResult, setResetResult] = useState<string | null>(null)

  const handleSync = () => {
    setSyncResult(null)
    startSync(async () => {
      const res = await triggerScoreSync()
      if (res.error) {
        setSyncResult(`Error: ${res.error}`)
      } else if (res.skipped) {
        setSyncResult(`Skipped — ${res.reason}`)
      } else {
        setSyncResult(`${res.changed ?? 0} score(s) updated`)
      }
    })
  }

  const handleSeed = () => {
    setSeedResult(null)
    startSeed(async () => {
      const res = await seedField()
      if (res.error) {
        setSeedResult(`Error: ${res.error}`)
      } else {
        setSeedResult(`Seeded ${res.count} golfers`)
        setTimeout(() => window.location.reload(), 800)
      }
    })
  }

  const handleReset = () => {
    if (!confirm('Reset all golfer scores to 0 and status to active? This cannot be undone.')) return
    setResetResult(null)
    startReset(async () => {
      const res = await resetAllScores()
      if (res.error) setResetResult(`Error: ${res.error}`)
      else setResetResult(`Reset ${res.count} golfers`)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
      <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Quick Actions</h2>
      <div className="flex flex-col gap-2">
        {/* Sync scores */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Sync Scores Now</p>
            <p className="text-xs text-gray-400">
              Last synced: {timeAgo(settings.last_synced_at)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={handleSync}
              disabled={syncPending}
              className="px-4 py-1.5 bg-masters-green text-white text-sm font-semibold rounded-full hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {syncPending ? 'Syncing…' : 'Sync'}
            </button>
            {syncResult && (
              <span className={`text-xs ${syncResult.startsWith('Error') ? 'text-red-500' : 'text-gray-500'}`}>
                {syncResult}
              </span>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Seed field */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Seed 2026 Field</p>
            <p className="text-xs text-gray-400">
              {golferCount > 0 ? `${golferCount} golfers already in DB` : 'No golfers yet'}
            </p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={handleSeed}
              disabled={seedPending}
              className="px-4 py-1.5 border border-masters-green text-masters-green text-sm font-semibold rounded-full hover:bg-masters-green hover:text-white disabled:opacity-50 transition-colors"
            >
              {seedPending ? 'Seeding…' : golferCount > 0 ? 'Re-seed' : 'Seed Field'}
            </button>
            {seedResult && (
              <span className={`text-xs ${seedResult.startsWith('Error') ? 'text-red-500' : 'text-gray-500'}`}>
                {seedResult}
              </span>
            )}
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Reset scores */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Reset All Scores</p>
            <p className="text-xs text-gray-400">Set everyone to E / active</p>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <button
              onClick={handleReset}
              disabled={resetPending || golferCount === 0}
              className="px-4 py-1.5 border border-red-400 text-red-500 text-sm font-semibold rounded-full hover:bg-red-50 disabled:opacity-30 transition-colors"
            >
              {resetPending ? 'Resetting…' : 'Reset'}
            </button>
            {resetResult && (
              <span className={`text-xs ${resetResult.startsWith('Error') ? 'text-red-500' : 'text-gray-500'}`}>
                {resetResult}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Pool settings ────────────────────────────────────────────────────────────

function PoolSettingsCard({ settings }: { settings: PoolSettings }) {
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
      <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Leaderboard Display</h2>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Official Winner Score (to par, e.g. -12)
          </label>
          <input
            type="number"
            value={winnerScore}
            onChange={(e) => { setWinnerScore(e.target.value); setSaved(false) }}
            placeholder="Leave blank until tournament ends"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Round Low Banner (shown at top of leaderboard)
          </label>
          <input
            type="text"
            value={roundLow}
            onChange={(e) => { setRoundLow(e.target.value); setSaved(false) }}
            placeholder='e.g. Scottie Scheffler -8 (Round 2) · leave blank to hide'
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      <button
        onClick={handleSave}
        disabled={isPending}
        className="mt-3 px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}

// ─── Rules config ─────────────────────────────────────────────────────────────

function RulesConfigCard({ settings }: { settings: PoolSettings }) {
  const [venmo, setVenmo] = useState(settings.venmo_handle ?? '@test-venmo')
  const [fee, setFee] = useState(settings.entry_fee?.toString() ?? '20')
  const [deadline, setDeadline] = useState(settings.submission_deadline ?? '')
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = () => {
    setError(null)
    startTransition(async () => {
      const res = await updateRulesConfig({
        venmo_handle: venmo.trim(),
        entry_fee: parseInt(fee) || 20,
        submission_deadline: deadline.trim(),
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
      <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Rules Page</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Venmo Handle
            </label>
            <input
              type="text"
              value={venmo}
              onChange={(e) => { setVenmo(e.target.value); setSaved(false) }}
              placeholder="@yourname"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              Entry Fee ($)
            </label>
            <input
              type="number"
              value={fee}
              onChange={(e) => { setFee(e.target.value); setSaved(false) }}
              placeholder="20"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Submission Deadline Text
          </label>
          <input
            type="text"
            value={deadline}
            onChange={(e) => { setDeadline(e.target.value); setSaved(false) }}
            placeholder="7 PM CT · Wednesday, April 8th"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-masters-green/50"
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}
      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="px-5 py-2 bg-masters-green text-white text-sm font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {saved ? 'Saved ✓' : isPending ? 'Saving…' : 'Save'}
        </button>
        <a
          href="/rules"
          target="_blank"
          className="text-xs text-masters-green underline"
        >
          Preview rules page →
        </a>
      </div>
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

  const isDirty = score !== golfer.current_score || status !== golfer.status

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
    6: 'bg-gray-100 text-gray-600',
  }

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/50">
      <td className="py-2.5 px-3 text-sm font-medium text-gray-800">{golfer.name}</td>
      <td className="py-2.5 px-3">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tierColors[golfer.tier] ?? 'bg-gray-100'}`}>
          T{golfer.tier}
        </span>
      </td>
      <td className="py-2.5 px-3">
        <input
          type="number"
          value={score}
          onChange={(e) => { setScore(parseInt(e.target.value) || 0); setSaved(false) }}
          className="w-20 border border-gray-300 rounded px-2 py-1 text-sm text-center focus:outline-none focus:ring-1 focus:ring-masters-green/50 tabular-nums"
        />
      </td>
      <td className="py-2.5 px-3">
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as Golfer['status']); setSaved(false) }}
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:outline-none"
        >
          <option value="active">Active</option>
          <option value="cut">Cut</option>
          <option value="wd">WD</option>
          <option value="dq">DQ</option>
        </select>
      </td>
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
          {saved ? 'Saved ✓' : isPending ? '…' : 'Save'}
        </button>
      </td>
    </tr>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export function AdminPanel({
  golfers,
  poolSettings,
  entryCount,
}: {
  golfers: Golfer[]
  poolSettings: PoolSettings
  entryCount: number
}) {
  const [settings, setSettings] = useState(poolSettings)
  const [isTogglingSubmissions, startToggle] = useTransition()

  const handleToggleSubmissions = () => {
    startToggle(async () => {
      const newVal = !settings.submissions_open
      const res = await updatePoolSettings({ submissions_open: newVal })
      if (!res.error) setSettings((s) => ({ ...s, submissions_open: newVal }))
    })
  }

  const tiers = [1, 2, 3, 4, 5, 6]

  return (
    <div>
      <StatusDashboard
        settings={settings}
        entryCount={entryCount}
        golferCount={golfers.length}
        onToggleSubmissions={handleToggleSubmissions}
        isTogglingSubmissions={isTogglingSubmissions}
      />

      <QuickActions settings={settings} golferCount={golfers.length} />

      <PoolSettingsCard settings={settings} />

      <RulesConfigCard settings={settings} />

      {/* Golfers table */}
      {golfers.length > 0 && (
        <details className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <summary className="px-5 py-3.5 cursor-pointer list-none flex items-center justify-between border-b border-gray-100">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Golfers</h2>
              <span className="text-xs text-gray-400">{golfers.length} players</span>
            </div>
            <span className="text-xs text-gray-400">tap to expand</span>
          </summary>
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
                    <col />
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
        </details>
      )}
    </div>
  )
}
