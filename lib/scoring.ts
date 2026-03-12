export type GolferRef = {
  id: number
  name: string
  tier: number
  current_score: number
  status: 'active' | 'cut' | 'wd' | 'dq'
}

export type EntryRow = {
  id: number
  entrant_name: string
  tier1_golfer_id: number
  tier2_golfer_id: number
  tier3_golfer_id: number
  tier4_golfer_id: number
  tier5_golfer_id: number
  tier6_golfer_id: number
  tiebreak_guess: number
  created_at: string
}

export type ScoredEntry = {
  id: number
  entrant_name: string
  tiebreak_guess: number
  created_at: string
  // golfers in tier order: [tier1, tier2, tier3, tier4, tier5, tier6]
  golfers: [GolferRef, GolferRef, GolferRef, GolferRef, GolferRef, GolferRef]
  total_score: number | null
  is_dq: boolean
  rank: number | null
}

export function formatScore(score: number): string {
  if (score === 0) return 'E'
  return score > 0 ? `+${score}` : `${score}`
}

export function buildScoredEntries(
  entries: EntryRow[],
  golferMap: Map<number, GolferRef>,
  winnerScore: number | null
): ScoredEntry[] {
  const scored: ScoredEntry[] = entries.map((entry) => {
    const golfers: [GolferRef, GolferRef, GolferRef, GolferRef, GolferRef, GolferRef] = [
      golferMap.get(entry.tier1_golfer_id) ?? placeholderGolfer(1),
      golferMap.get(entry.tier2_golfer_id) ?? placeholderGolfer(2),
      golferMap.get(entry.tier3_golfer_id) ?? placeholderGolfer(3),
      golferMap.get(entry.tier4_golfer_id) ?? placeholderGolfer(4),
      golferMap.get(entry.tier5_golfer_id) ?? placeholderGolfer(5),
      golferMap.get(entry.tier6_golfer_id) ?? placeholderGolfer(6),
    ]

    // A team is DQ'd if any golfer is WD or DQ
    const isDQ = golfers.some((g) => g.status === 'wd' || g.status === 'dq')
    const total = isDQ
      ? null
      : golfers.reduce((sum, g) => sum + g.current_score, 0)

    return {
      id: entry.id,
      entrant_name: entry.entrant_name,
      tiebreak_guess: entry.tiebreak_guess,
      created_at: entry.created_at,
      golfers,
      total_score: total,
      is_dq: isDQ,
      rank: null,
    }
  })

  const active = scored.filter((e) => !e.is_dq)
  const dqd = scored.filter((e) => e.is_dq)

  active.sort((a, b) => {
    const aT = a.total_score!
    const bT = b.total_score!
    if (aT !== bT) return aT - bT

    // Tiebreak 1: closest guess to winner score
    if (winnerScore !== null) {
      const aDiff = Math.abs(a.tiebreak_guess - winnerScore)
      const bDiff = Math.abs(b.tiebreak_guess - winnerScore)
      if (aDiff !== bDiff) return aDiff - bDiff
    }

    // Tiebreak 2: tier 6 score (index 5)
    const t6 = a.golfers[5].current_score - b.golfers[5].current_score
    if (t6 !== 0) return t6

    // Tiebreak 3: tier 3 score (index 2)
    const t3 = a.golfers[2].current_score - b.golfers[2].current_score
    if (t3 !== 0) return t3

    // Tiebreak 4: tier 4 score (index 3)
    return a.golfers[3].current_score - b.golfers[3].current_score
  })

  active.forEach((e, i) => {
    e.rank = i + 1
  })

  return [...active, ...dqd]
}

function placeholderGolfer(tier: number): GolferRef {
  return { id: 0, name: 'Unknown', tier, current_score: 0, status: 'active' }
}
