/**
 * lib/espn.ts — Server-only ESPN leaderboard scraper (TypeScript).
 *
 * Used by the Vercel cron job (/api/cron/sync-scores).
 * Mirrors the logic in sync_scores.py.
 */

import * as cheerio from 'cheerio'

export type ESPNGolfer = {
  name: string
  score: number        // cumulative score to par (e.g. -11)
  status: 'active' | 'cut' | 'wd' | 'dq'
  bestRoundScore: number | null   // best single-round to-par score
  bestRoundNum: number | null     // which round (1–4)
}

const ESPN_URL = 'https://www.espn.com/golf/leaderboard'

const FETCH_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
}

// ─── Score parsing ────────────────────────────────────────────────────────────

function parseScoreStr(s: string): { score: number; status: ESPNGolfer['status'] } {
  const u = s.trim().toUpperCase()
  if (u === 'E') return { score: 0, status: 'active' }
  if (['CUT', 'MC', 'MDF'].includes(u)) return { score: 0, status: 'cut' }
  if (['WD', 'W/D', 'WITHDRAWN'].includes(u)) return { score: 0, status: 'wd' }
  if (['DQ', 'DISQUALIFIED'].includes(u)) return { score: 0, status: 'dq' }
  const n = parseInt(u, 10)
  if (!isNaN(n)) return { score: n, status: 'active' }
  return { score: 0, status: 'active' }
}

function bestRound(roundGrossScores: number[]): {
  score: number | null
  round: number | null
} {
  if (!roundGrossScores.length) return { score: null, round: null }
  // Convert gross to to-par (approximate — Augusta is par 72)
  const toPar = roundGrossScores.map((g) => g - 72)
  const min = Math.min(...toPar)
  const idx = toPar.indexOf(min)
  return { score: min, round: idx + 1 }
}

// ─── Embedded JSON extraction ─────────────────────────────────────────────────

function tryExtractJSON(html: string): Record<string, unknown> | null {
  const patterns = [
    /window\s*\[\s*['"]__espnfitt__['"]\s*\]\s*=\s*(\{[\s\S]+?\})\s*;/,
    /window\.__espnfitt__\s*=\s*(\{[\s\S]+?\})\s*;/,
  ]
  for (const pat of patterns) {
    const m = html.match(pat)
    if (m) {
      try {
        return JSON.parse(m[1]) as Record<string, unknown>
      } catch {
        // continue
      }
    }
  }
  return null
}

function deepGet(obj: unknown, ...keys: string[]): unknown {
  let cur = obj
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[k]
  }
  return cur
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function fetchESPNLeaderboard(): Promise<ESPNGolfer[]> {
  const resp = await fetch(ESPN_URL, {
    headers: FETCH_HEADERS,
    // Always bypass Next.js cache for this endpoint
    cache: 'no-store',
  })

  if (!resp.ok) {
    throw new Error(`ESPN fetch failed with HTTP ${resp.status}`)
  }

  const html = await resp.text()
  return parseLeaderboard(html)
}

export function parseLeaderboard(html: string): ESPNGolfer[] {
  const players: ESPNGolfer[] = []

  // ── Strategy 1: embedded JSON ───────────────────────────────────────────────
  const data = tryExtractJSON(html)
  if (data) {
    const competitors =
      (deepGet(data, 'page', 'content', 'leaderboard', 'competitors') as unknown[]) ||
      (deepGet(data, 'page', 'content', 'tournament', 'competitors') as unknown[]) ||
      []

    for (const raw of competitors) {
      const comp = raw as Record<string, unknown>
      const name = (
        (comp['displayName'] as string) ||
        ((comp['athlete'] as Record<string, unknown>)?.['displayName'] as string) ||
        (comp['name'] as string) ||
        ''
      ).trim()
      if (!name) continue

      const scoreRaw = String(
        (comp['score'] as Record<string, unknown>)?.['displayValue'] ??
          comp['total'] ??
          comp['totalScore'] ??
          '0'
      )
      const statusDesc = String(
        ((comp['status'] as Record<string, unknown>)?.['type'] as Record<string, unknown>)
          ?.['description'] ?? ''
      ).toLowerCase()

      let status: ESPNGolfer['status'] = 'active'
      let score = 0

      if (statusDesc.includes('cut')) {
        status = 'cut'
      } else if (statusDesc.includes('withdraw')) {
        status = 'wd'
      } else if (statusDesc.includes('disqualif')) {
        status = 'dq'
      } else {
        const parsed = parseScoreStr(scoreRaw)
        score = parsed.score
        status = parsed.status
      }

      // Round scores
      const rounds = (comp['linescores'] as unknown[]) || (comp['rounds'] as unknown[]) || []
      const grossRounds = rounds
        .map((r) => {
          const v =
            (r as Record<string, unknown>)['value'] ??
            (r as Record<string, unknown>)['score']
          const n = typeof v === 'number' ? v : parseInt(String(v), 10)
          return isNaN(n) ? null : n
        })
        .filter((n): n is number => n !== null)

      const { score: br, round: brNum } = bestRound(grossRounds)
      players.push({ name, score, status, bestRoundScore: br, bestRoundNum: brNum })
    }

    if (players.length >= 10) return players
  }

  // ── Strategy 2: HTML table via cheerio ──────────────────────────────────────
  const $ = cheerio.load(html)
  $('tr.Table__TR, tr[class*="Table__TR"]').each((_i, row) => {
    const nameEl = $(row).find('a[href*="/golf/player"]').first()
    if (!nameEl.length) return

    const name = nameEl.text().trim()
    if (!name || name.length < 3) return

    const cells = $(row).find('td')
    if (cells.length < 3) return

    const scoreText = cells.eq(2).text().trim()
    const { score, status } = parseScoreStr(scoreText)

    players.push({ name, score, status, bestRoundScore: null, bestRoundNum: null })
  })

  return players
}

// ─── Last-name fuzzy matcher ──────────────────────────────────────────────────

/**
 * Match a DB golfer name to an ESPN player by last name.
 * Handles the common case where name formatting differs slightly between sources.
 * Returns null if no confident match is found.
 */
export function matchByLastName(
  dbName: string,
  espnPlayers: ESPNGolfer[]
): ESPNGolfer | null {
  const dbLast = dbName.split(' ').pop()!.toLowerCase()

  // Exact last-name match
  const matches = espnPlayers.filter(
    (p) => p.name.split(' ').pop()!.toLowerCase() === dbLast
  )
  if (matches.length === 1) return matches[0]

  // Fall back to full-name exact match
  return espnPlayers.find((p) => p.name === dbName) ?? null
}
