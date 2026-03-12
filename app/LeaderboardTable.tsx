'use client'

import { useState, useEffect, useRef } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import type { ScoredEntry, GolferRef } from '@/lib/scoring'
import type { LeaderboardData } from '@/lib/leaderboard'
import { formatScore } from '@/lib/scoring'

// ─── Types ────────────────────────────────────────────────────────────────────

type Delta = 'improved' | 'worse' | 'unchanged'
type ScoreMap = Record<number, number>  // golfer id → current_score

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildScoreMap(entries: ScoredEntry[]): ScoreMap {
  const m: ScoreMap = {}
  for (const e of entries) {
    for (const g of e.golfers) {
      if (g.id) m[g.id] = g.current_score
    }
  }
  return m
}

function timeAgo(isoTs: string | null, nowMs: number): string {
  if (!isoTs) return 'never synced'
  const mins = Math.floor((nowMs - new Date(isoTs).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins === 1) return '1 min ago'
  if (mins < 60) return `${mins} mins ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ─── Status indicators ────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  cut:    'bg-red-400',
  wd:     'bg-orange-400',
  dq:     'bg-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  cut:    'Cut',
  wd:     'WD',
  dq:     'DQ',
}

// ─── Delta icon ───────────────────────────────────────────────────────────────

function DeltaIcon({ delta }: { delta: Delta }) {
  if (delta === 'improved')
    return (
      <span
        className="text-green-500 text-[10px] font-bold leading-none"
        title="Score improved"
      >
        ▼
      </span>
    )
  if (delta === 'worse')
    return (
      <span
        className="text-red-500 text-[10px] font-bold leading-none"
        title="Score worsened"
      >
        ▲
      </span>
    )
  return (
    <span className="text-gray-300 text-[10px] font-bold leading-none" title="No change">
      —
    </span>
  )
}

// ─── Golfer detail line ───────────────────────────────────────────────────────

function GolferLine({
  g,
  tierNum,
  delta,
}: {
  g: GolferRef
  tierNum: number
  delta: Delta
}) {
  const isOut = g.status === 'wd' || g.status === 'dq'
  return (
    <div className="flex items-center justify-between py-1.5 min-w-0">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <span className="text-xs text-gray-400 w-12 shrink-0">Tier {tierNum}</span>
        <span
          className={`truncate text-sm font-medium ${
            isOut ? 'line-through text-gray-400' : 'text-gray-800'
          }`}
        >
          {g.name}
        </span>
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-3">
        <DeltaIcon delta={delta} />
        <span
          className={`text-sm font-semibold tabular-nums ${
            isOut ? 'text-gray-400' : 'text-gray-700'
          }`}
        >
          {formatScore(g.current_score)}
        </span>
        <div className="flex items-center gap-1 ml-1">
          <span
            className={`inline-block w-2 h-2 rounded-full shrink-0 ${
              STATUS_DOT[g.status] ?? 'bg-gray-400'
            }`}
          />
          <span className="text-xs text-gray-400">
            {STATUS_LABEL[g.status] ?? g.status}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Entry card ───────────────────────────────────────────────────────────────

function EntryCard({
  entry,
  expanded,
  onToggle,
  deltas,
}: {
  entry: ScoredEntry
  expanded: boolean
  onToggle: () => void
  deltas: Record<number, Delta>
}) {
  const isTopTen = entry.rank !== null && entry.rank <= 10

  const scoreDisplay =
    entry.is_dq || entry.total_score === null ? 'DQ' : formatScore(entry.total_score)

  const scoreColor =
    entry.is_dq || entry.total_score === null
      ? 'text-gray-400'
      : entry.total_score < 0
        ? 'text-masters-green font-bold'
        : entry.total_score > 0
          ? 'text-red-600 font-bold'
          : 'text-gray-700 font-bold'

  const cardBg = entry.is_dq
    ? 'border-gray-200 bg-gray-50 opacity-70'
    : isTopTen
      ? 'border-masters-gold/50 bg-masters-gold/5'
      : 'border-gray-200 bg-white'

  return (
    <div className={`rounded-xl border overflow-hidden ${cardBg}`}>
      {/* Main row — always visible, tap/click to expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
        aria-expanded={expanded}
      >
        {/* Rank */}
        <div className="w-9 shrink-0 text-center">
          {entry.is_dq ? (
            <span className="text-[10px] font-bold text-gray-400 bg-gray-200 rounded px-1 py-0.5">
              DQ
            </span>
          ) : (
            <span
              className={`text-sm font-bold tabular-nums ${
                isTopTen ? 'text-masters-gold' : 'text-gray-400'
              }`}
            >
              #{entry.rank}
            </span>
          )}
        </div>

        {/* Name */}
        <span className="flex-1 text-sm font-semibold text-gray-800 truncate min-w-0">
          {entry.entrant_name}
        </span>

        {/* Score */}
        <span className={`text-base tabular-nums shrink-0 ${scoreColor}`}>
          {scoreDisplay}
        </span>

        {/* Chevron */}
        <svg
          className={`shrink-0 w-4 h-4 text-gray-400 transition-transform duration-150 ${
            expanded ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/60 divide-y divide-gray-100">
          {entry.golfers.map((g, i) => (
            <GolferLine
              key={g.id || i}
              g={g}
              tierNum={i + 1}
              delta={deltas[g.id] ?? 'unchanged'}
            />
          ))}
          <div className="flex justify-between items-center pt-2 pb-1 text-xs text-gray-400 flex-wrap gap-1">
            <span>Tiebreak: {formatScore(entry.tiebreak_guess)}</span>
            <span>Entered {new Date(entry.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function buildPageNums(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: (number | '…')[] = [1]
  if (current > 3) out.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++)
    out.push(p)
  if (current < total - 2) out.push('…')
  out.push(total)
  return out
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeaderboardTable({ initialData }: { initialData: LeaderboardData }) {
  const isComplete = initialData.winnerScore !== null

  // SWR polling — stops when tournament is complete
  const { data = initialData, isValidating } = useSWR<LeaderboardData>(
    `/api/leaderboard?page=${initialData.currentPage}`,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: isComplete ? 0 : 3 * 60 * 1000,   // every 3 min
      revalidateOnFocus: !isComplete,
      revalidateOnReconnect: !isComplete,
    }
  )

  // ── Score delta tracking ──────────────────────────────────────────────────
  const prevScoresRef = useRef<ScoreMap>(buildScoreMap(initialData.entries))
  const [deltas, setDeltas] = useState<Record<number, Delta>>({})

  // Track the SWR data identity to only trigger on genuine refreshes
  const prevDataRef = useRef<LeaderboardData | null>(null)
  useEffect(() => {
    if (!data || data === prevDataRef.current) return
    prevDataRef.current = data

    const newMap = buildScoreMap(data.entries)
    const newDeltas: Record<number, Delta> = {}
    for (const [rawId, newScore] of Object.entries(newMap)) {
      const id = parseInt(rawId, 10)
      const prev = prevScoresRef.current[id]
      if (prev === undefined) {
        newDeltas[id] = 'unchanged'
      } else if (newScore < prev) {
        newDeltas[id] = 'improved'   // lower score = better in golf
      } else if (newScore > prev) {
        newDeltas[id] = 'worse'
      } else {
        newDeltas[id] = 'unchanged'
      }
    }
    setDeltas(newDeltas)
    prevScoresRef.current = newMap
  }, [data])

  // ── "Last updated" ticking clock ──────────────────────────────────────────
  const [nowMs, setNowMs] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  // ── Row expansion (one at a time) ─────────────────────────────────────────
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const toggle = (id: number) => setExpandedId((prev) => (prev === id ? null : id))

  const { entries, totalEntries, totalPages, currentPage, roundLowLabel, lastSyncedAt } = data

  return (
    <div>
      {/* Tournament complete banner */}
      {isComplete && (
        <div className="mb-4 rounded-xl bg-masters-green text-white px-4 py-3 flex items-start gap-3">
          <span className="text-2xl shrink-0">🏆</span>
          <div>
            <p className="font-bold text-masters-gold text-sm">Tournament Complete</p>
            <p className="text-sm text-white/80 mt-0.5">
              Official winner score:{' '}
              <strong>
                {data.winnerScore === 0
                  ? 'E'
                  : (data.winnerScore ?? 0) > 0
                    ? `+${data.winnerScore}`
                    : data.winnerScore}
              </strong>
              . Tiebreaks are now fully resolved.
            </p>
          </div>
        </div>
      )}

      {/* Round Low banner */}
      {roundLowLabel && (
        <div className="mb-4 flex items-center gap-2 bg-masters-gold text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-sm">
          <span className="text-base shrink-0">🦅</span>
          <span className="min-w-0 truncate">Round Low: {roundLowLabel}</span>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{totalEntries}</span>{' '}
          {totalEntries === 1 ? 'entry' : 'entries'}
          {totalPages > 1 && (
            <span className="text-gray-400 ml-2">
              · Page {currentPage} of {totalPages}
            </span>
          )}
        </p>

        <div className="flex items-center gap-2 text-xs text-gray-400">
          {isValidating && (
            <span className="inline-block w-1.5 h-1.5 bg-masters-green rounded-full animate-pulse" />
          )}
          {!isComplete && (
            <span>
              Last updated:{' '}
              <span className="text-gray-500 font-medium">
                {timeAgo(lastSyncedAt, nowMs)}
              </span>
            </span>
          )}
          {isComplete && <span className="text-masters-green font-medium">Final results</span>}
        </div>
      </div>

      {/* Entry cards */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            expanded={expandedId === entry.id}
            onToggle={() => toggle(entry.id)}
            deltas={deltas}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={`/?page=${currentPage - 1}`}
              className="px-4 py-2 text-sm font-medium text-masters-green border border-masters-green rounded-lg hover:bg-masters-green/5 transition-colors"
            >
              ← Prev
            </Link>
          )}

          <div className="flex flex-wrap gap-1 justify-center">
            {buildPageNums(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`e${i}`} className="px-2 py-2 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={`/?page=${p}`}
                  className={[
                    'w-9 h-9 flex items-center justify-center text-sm rounded-lg',
                    p === currentPage
                      ? 'bg-masters-green text-white font-semibold'
                      : 'text-gray-700 hover:bg-gray-100',
                  ].join(' ')}
                >
                  {p}
                </Link>
              )
            )}
          </div>

          {currentPage < totalPages && (
            <Link
              href={`/?page=${currentPage + 1}`}
              className="px-4 py-2 text-sm font-medium text-masters-green border border-masters-green rounded-lg hover:bg-masters-green/5 transition-colors"
            >
              Next →
            </Link>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-400 justify-center">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500" /> Active
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" /> Cut
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-400" /> WD
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-600" /> DQ
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm border border-masters-gold/50 bg-masters-gold/10" />{' '}
          Top 10
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-500 text-[10px] font-bold">▼</span> Improved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-red-500 text-[10px] font-bold">▲</span> Worsened
        </span>
      </div>
    </div>
  )
}
