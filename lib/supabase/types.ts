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
}
