export type GolferStatus = 'active' | 'cut' | 'wd' | 'dq'

export interface Golfer {
  id: number
  name: string
  tier: 1 | 2 | 3 | 4 | 5 | 6
  current_score: number
  status: GolferStatus
}

export interface Entry {
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

export interface PoolSettings {
  id: number
  submissions_open: boolean
  winner_score: number | null
  /** Set by the score-sync script. Example: "Tiger Woods −8 (R2) · 23 entries" */
  round_low_label: string | null
  /** ISO timestamp of the last successful score sync */
  last_synced_at: string | null
}

export interface GolferWithRounds extends Golfer {
  /** Best single-round score to par (e.g. -8) */
  best_round_score: number | null
  /** Which round (1–4) achieved the best score */
  best_round_num: number | null
}
