'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ScoredEntry, GolferRef } from '@/lib/scoring'
import { formatScore } from '@/lib/scoring'

const PER_PAGE = 50

const STATUS_DOT: Record<string, string> = {
  active: 'bg-green-500',
  cut: 'bg-red-400',
  wd: 'bg-orange-400',
  dq: 'bg-red-600',
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  cut: 'Cut',
  wd: 'WD',
  dq: 'DQ',
}

function GolferLine({ g, tierNum }: { g: GolferRef; tierNum: number }) {
  const isOut = g.status === 'wd' || g.status === 'dq'
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-xs text-gray-400 w-12 shrink-0">Tier {tierNum}</span>
        <span className={`truncate font-medium ${isOut ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {g.name}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-4">
        <span className={`font-semibold tabular-nums ${isOut ? 'text-gray-400' : 'text-gray-700'}`}>
          {formatScore(g.current_score)}
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[g.status] ?? 'bg-gray-400'}`} />
          {STATUS_LABEL[g.status] ?? g.status}
        </span>
      </div>
    </div>
  )
}

function EntryCard({
  entry,
  expanded,
  onToggle,
}: {
  entry: ScoredEntry
  expanded: boolean
  onToggle: () => void
}) {
  const isTopTen = entry.rank !== null && entry.rank <= 10

  const cardClass = [
    'rounded-xl border overflow-hidden transition-shadow',
    entry.is_dq
      ? 'border-gray-200 bg-gray-50 opacity-70'
      : isTopTen
        ? 'border-masters-gold/50 bg-masters-gold/5 shadow-sm'
        : 'border-gray-200 bg-white',
  ].join(' ')

  const scoreDisplay = entry.is_dq
    ? 'DQ'
    : entry.total_score === null
      ? '—'
      : formatScore(entry.total_score)

  const scoreColor = entry.is_dq
    ? 'text-gray-400'
    : entry.total_score === null
      ? 'text-gray-400'
      : entry.total_score < 0
        ? 'text-masters-green font-bold'
        : entry.total_score > 0
          ? 'text-red-600 font-bold'
          : 'text-gray-700 font-bold'

  return (
    <div className={cardClass}>
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-black/[0.02] active:bg-black/[0.04] transition-colors"
        aria-expanded={expanded}
      >
        {/* Rank badge */}
        <div className="shrink-0 w-9 text-center">
          {entry.is_dq ? (
            <span className="text-xs font-bold text-gray-400 bg-gray-200 rounded px-1.5 py-0.5">DQ</span>
          ) : (
            <span
              className={[
                'text-sm font-bold tabular-nums',
                isTopTen ? 'text-masters-gold' : 'text-gray-500',
              ].join(' ')}
            >
              #{entry.rank}
            </span>
          )}
        </div>

        {/* Name */}
        <span className="flex-1 font-semibold text-gray-800 text-sm truncate">
          {entry.entrant_name}
        </span>

        {/* Total score */}
        <span className={`text-base tabular-nums shrink-0 ${scoreColor}`}>
          {scoreDisplay}
        </span>

        {/* Chevron */}
        <svg
          className={`shrink-0 w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-2 bg-gray-50/60 divide-y divide-gray-100">
          {entry.golfers.map((g, i) => (
            <GolferLine key={g.id || i} g={g} tierNum={i + 1} />
          ))}
          {!entry.is_dq && (
            <div className="flex justify-between items-center pt-2 pb-1 text-xs text-gray-400">
              <span>Tiebreak guess: {formatScore(entry.tiebreak_guess)}</span>
              <span>Submitted {new Date(entry.created_at).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LeaderboardTable({
  entries,
  totalEntries,
  currentPage,
  totalPages,
}: {
  entries: ScoredEntry[]
  totalEntries: number
  currentPage: number
  totalPages: number
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const toggle = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id))

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-800">{totalEntries}</span>{' '}
          {totalEntries === 1 ? 'entry' : 'entries'} submitted
        </p>
        {totalPages > 1 && (
          <p className="text-xs text-gray-400">
            Page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {/* Entry cards */}
      <div className="space-y-2">
        {entries.map((entry) => (
          <EntryCard
            key={entry.id}
            entry={entry}
            expanded={expandedId === entry.id}
            onToggle={() => toggle(entry.id)}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          {currentPage > 1 && (
            <Link
              href={`/?page=${currentPage - 1}`}
              className="px-4 py-2 text-sm font-medium text-masters-green border border-masters-green rounded-lg hover:bg-masters-green/5 transition-colors"
            >
              ← Previous
            </Link>
          )}

          <div className="flex gap-1">
            {buildPageNumbers(currentPage, totalPages).map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 py-2 text-sm text-gray-400">
                  …
                </span>
              ) : (
                <Link
                  key={p}
                  href={`/?page=${p}`}
                  className={[
                    'w-9 h-9 flex items-center justify-center text-sm rounded-lg transition-colors',
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
      <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-500 justify-center">
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
          <span className="inline-block w-3 h-3 rounded-sm border border-masters-gold/50 bg-masters-gold/10" />
          Top 10
        </span>
      </div>
    </div>
  )
}

/** Build a compact set of page numbers with ellipsis. */
function buildPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]
  if (current > 3) pages.push('…')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }
  if (current < total - 2) pages.push('…')
  pages.push(total)
  return pages
}
