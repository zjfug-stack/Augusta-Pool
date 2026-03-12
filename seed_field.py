#!/usr/bin/env python3
"""
seed_field.py — Seed the Masters field into Supabase.

Scrapes the Masters field and OWGR rankings from ESPN, assigns tiers by rank,
and upserts every player into the Supabase `golfers` table.

Usage:
    python seed_field.py            # write to database
    python seed_field.py --dry-run  # print tier assignments only
"""

import argparse
import json
import os
import re
import sys
import time
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fuzzywuzzy import fuzz, process
from supabase import create_client, Client

load_dotenv()

# ─── URLs ─────────────────────────────────────────────────────────────────────

ESPN_LEADERBOARD_URL  = "https://www.espn.com/golf/leaderboard"
ESPN_FIELD_URL        = "https://www.espn.com/golf/tournament/field/_/id/2816"
ESPN_RANKINGS_URL     = "https://www.espn.com/golf/rankings"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
}

# ─── Tier cutoffs ─────────────────────────────────────────────────────────────

TIER_CUTOFFS = [
    (5,  1),   # OWGR rank 1–5   → Tier 1
    (15, 2),   # OWGR rank 6–15  → Tier 2
    (30, 3),   # OWGR rank 16–30 → Tier 3
    (50, 4),   # OWGR rank 31–50 → Tier 4
    (75, 5),   # OWGR rank 51–75 → Tier 5
               # rank 76+/unranked → Tier 6
]

def assign_tier(rank: Optional[int]) -> int:
    if rank is None:
        return 6
    for cutoff, tier in TIER_CUTOFFS:
        if rank <= cutoff:
            return tier
    return 6


# ─── HTTP helpers ─────────────────────────────────────────────────────────────

def fetch_page(url: str) -> BeautifulSoup:
    """Fetch a URL and return a BeautifulSoup object."""
    time.sleep(1.0)  # polite crawl rate
    resp = requests.get(url, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    return BeautifulSoup(resp.text, "lxml")


def try_extract_embedded_json(soup: BeautifulSoup) -> Optional[dict]:
    """
    ESPN embeds page data in a JS global variable. Try to pull it out.
    Common patterns:
      window['__espnfitt__'] = {...};
      window.__espnfitt__ = {...};
    """
    patterns = [
        r"window\[['\"]\s*__espnfitt__\s*['\"]\]\s*=\s*(\{.+?\})\s*;",
        r"window\.__espnfitt__\s*=\s*(\{.+?\})\s*;",
        r"espn\.pageData\s*=\s*(\{.+?\})\s*;",
    ]
    for script in soup.find_all("script"):
        text = script.string or ""
        if "__espnfitt__" not in text and "pageData" not in text:
            continue
        for pat in patterns:
            m = re.search(pat, text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except (json.JSONDecodeError, ValueError):
                    pass
    return None


# ─── Field scraping ──────────────────────────────────────────────────────────

def scrape_field() -> list[str]:
    """
    Scrape the Masters field.  Tries the live leaderboard first (if the
    tournament is in progress); falls back to the dedicated field page.
    Returns a sorted list of player name strings.
    """
    print("  Fetching ESPN leaderboard (primary)…")
    try:
        soup = fetch_page(ESPN_LEADERBOARD_URL)
        names = _parse_player_names(soup)
        if len(names) >= 10:
            print(f"  ✓ Found {len(names)} players on leaderboard page")
            return names
        print(f"  ⚠  Only {len(names)} names on leaderboard — trying field page…")
    except Exception as e:
        print(f"  Leaderboard error ({e}) — trying field page…")

    print("  Fetching ESPN field page (fallback)…")
    soup = fetch_page(ESPN_FIELD_URL)
    names = _parse_player_names(soup)
    if len(names) >= 10:
        print(f"  ✓ Found {len(names)} players on field page")
        return names

    raise RuntimeError(
        f"Could not scrape the Masters field (found {len(names)} players).\n"
        "ESPN may have changed their page structure.  Inspect the page source\n"
        "and update _parse_player_names() accordingly."
    )


def _normalize_name(raw: str) -> str:
    """
    Normalize ESPN player names to 'First Last' format.
    ESPN sometimes shows 'Last, First' in field listings.
    """
    raw = raw.strip()
    if "," in raw:
        parts = [p.strip() for p in raw.split(",", 1)]
        return f"{parts[1]} {parts[0]}"
    return raw


def _parse_player_names(soup: BeautifulSoup) -> list[str]:
    """Extract a de-duplicated list of player names from an ESPN golf page."""
    names: set[str] = set()

    # ── Strategy 1: embedded JSON ──
    data = try_extract_embedded_json(soup)
    if data:
        candidate_paths = [
            ["page", "content", "leaderboard", "competitors"],
            ["page", "content", "tournament", "competitors"],
            ["page", "content", "field", "competitors"],
            ["page", "content", "athletes"],
        ]
        for path in candidate_paths:
            node = data
            try:
                for key in path:
                    node = node[key]
                for comp in node:
                    name = (
                        comp.get("displayName")
                        or comp.get("athlete", {}).get("displayName")
                        or comp.get("name")
                        or ""
                    )
                    if name and len(name) > 3:
                        names.add(_normalize_name(name))
            except (KeyError, TypeError):
                pass
        if len(names) >= 10:
            return sorted(names)

    # ── Strategy 2: anchor tags with golf player URLs ──
    for a in soup.find_all("a", href=re.compile(r"/golf/player")):
        text = a.get_text(strip=True)
        if text and 3 < len(text) < 60:
            names.add(_normalize_name(text))

    # ── Strategy 3: generic table rows ──
    for row in soup.select("tr.Table__TR, tr[class*='Table__TR']"):
        for cell in row.find_all("td"):
            a = cell.find("a", href=re.compile(r"/golf/player"))
            if a:
                text = a.get_text(strip=True)
                if text and 3 < len(text) < 60:
                    names.add(_normalize_name(text))

    return sorted(names)


# ─── Rankings scraping ────────────────────────────────────────────────────────

def scrape_rankings() -> list[dict]:
    """
    Scrape the OWGR rankings from ESPN's rankings page.
    Returns a list of {"rank": int, "name": str} dicts, sorted by rank.
    """
    print("  Fetching OWGR rankings from ESPN…")
    soup = fetch_page(ESPN_RANKINGS_URL)
    players: list[dict] = []

    # ── Strategy 1: embedded JSON ──
    data = try_extract_embedded_json(soup)
    if data:
        for path in [
            ["page", "content", "rankings", "athletes"],
            ["page", "content", "athletes"],
        ]:
            node = data
            try:
                for key in path:
                    node = node[key]
                for p in node:
                    rank = p.get("rank") or (p.get("rankChange") or {}).get("current")
                    name = (
                        p.get("displayName")
                        or p.get("athlete", {}).get("displayName")
                        or p.get("name")
                        or ""
                    )
                    if name and rank:
                        players.append({"rank": int(rank), "name": _normalize_name(name)})
            except (KeyError, TypeError):
                pass
        if len(players) >= 10:
            print(f"  ✓ Found {len(players)} ranked players (JSON)")
            return sorted(players, key=lambda x: x["rank"])

    # ── Strategy 2: HTML table ──
    for row in soup.select("tr.Table__TR, tr[class*='Table__TR']"):
        cells = row.find_all("td")
        if len(cells) < 2:
            continue
        rank_text = cells[0].get_text(strip=True).lstrip("T").strip()
        if not rank_text.isdigit():
            continue
        rank = int(rank_text)
        # Name is usually in the second cell
        for cell in cells[1:3]:
            a = cell.find("a")
            name = (a or cell).get_text(strip=True)
            if name and 3 < len(name) < 60:
                players.append({"rank": rank, "name": _normalize_name(name)})
                break

    if players:
        print(f"  ✓ Found {len(players)} ranked players (HTML)")
    else:
        print("  ⚠  No rankings found — all players will be assigned Tier 6")

    return sorted(players, key=lambda x: x["rank"])


# ─── Name matching ────────────────────────────────────────────────────────────

def match_to_rankings(
    field_name: str,
    rankings: list[dict],
    threshold: int = 75,
) -> Optional[int]:
    """
    Match a player name from the field against the rankings list.
    Returns the OWGR rank if a confident match is found, else None.

    Matching order:
      1. Exact full-name match
      2. Exact last-name match (unambiguous)
      3. Fuzzy full-name match (fuzzywuzzy token_sort_ratio)
    """
    if not rankings:
        return None

    name_to_rank = {r["name"]: r["rank"] for r in rankings}

    # 1. Exact match
    if field_name in name_to_rank:
        return name_to_rank[field_name]

    # 2. Exact last-name match
    field_last = field_name.split()[-1].lower()
    last_matches = [
        r for r in rankings if r["name"].split()[-1].lower() == field_last
    ]
    if len(last_matches) == 1:
        return last_matches[0]["rank"]

    # 3. Fuzzy full-name
    ranking_names = list(name_to_rank.keys())
    result = process.extractOne(
        field_name, ranking_names, scorer=fuzz.token_sort_ratio
    )
    if result and result[1] >= threshold:
        return name_to_rank[result[0]]

    return None


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the Masters field into Supabase.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print tier assignments without writing to Supabase.",
    )
    args = parser.parse_args()

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not args.dry_run and (not supabase_url or not supabase_key):
        print(
            "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "must be set in .env (copy .env.local.example → .env and fill in)."
        )
        sys.exit(1)

    print("\n╔══════════════════════════════════════╗")
    print("║   Masters Pool — Field Seeder        ║")
    print("╚══════════════════════════════════════╝\n")

    # ── Step 1: scrape field ──────────────────────────────────────────────────
    print("Step 1/3 — Scraping Masters field…")
    try:
        field_names = scrape_field()
    except Exception as e:
        print(f"  ✗ {e}")
        sys.exit(1)

    # ── Step 2: scrape rankings ───────────────────────────────────────────────
    print("\nStep 2/3 — Scraping OWGR rankings…")
    try:
        rankings = scrape_rankings()
    except Exception as e:
        print(f"  ⚠  Could not fetch rankings ({e}) — all players default to Tier 6")
        rankings = []

    # ── Step 3: assign tiers ──────────────────────────────────────────────────
    print("\nStep 3/3 — Assigning tiers…\n")

    players: list[dict] = []
    unmatched: list[str] = []
    tier_counts = {t: 0 for t in range(1, 7)}

    for name in sorted(field_names):
        rank = match_to_rankings(name, rankings)
        tier = assign_tier(rank)
        tier_counts[tier] += 1
        players.append({"name": name, "rank": rank, "tier": tier})
        if rank is None:
            unmatched.append(name)

    # ── Print summary table ───────────────────────────────────────────────────
    col = max((len(p["name"]) for p in players), default=30) + 2
    print(f"  {'Player':<{col}} {'OWGR Rank':>10}   Tier")
    print(f"  {'-' * col} {'----------':>10}   ----")

    for tier_num in range(1, 7):
        tier_players = sorted(
            [p for p in players if p["tier"] == tier_num],
            key=lambda p: p["rank"] or 9999,
        )
        for p in tier_players:
            rank_str = str(p["rank"]) if p["rank"] is not None else "—"
            print(f"  {p['name']:<{col}} {rank_str:>10}   {p['tier']}")
        if tier_num < 6 and tier_players:
            print()

    print(f"\n  Tier breakdown:")
    for t, count in tier_counts.items():
        bar = "█" * min(count, 40)
        print(f"    Tier {t}: {count:>3} players  {bar}")

    if unmatched:
        print(f"\n  ⚠  {len(unmatched)} player(s) not found in rankings (→ Tier 6):")
        for name in unmatched:
            print(f"       • {name}")

    print(f"\n  Total field: {len(players)} players\n")

    if args.dry_run:
        print("  [--dry-run] Nothing was written to Supabase.\n")
        return

    # ── Upsert to Supabase ────────────────────────────────────────────────────
    print("  Upserting to Supabase…")
    client: Client = create_client(supabase_url, supabase_key)  # type: ignore[arg-type]

    rows = [
        {
            "name": p["name"],
            "tier": p["tier"],
            "current_score": 0,
            "status": "active",
        }
        for p in players
    ]

    # Upsert in batches of 50 (Supabase has payload size limits)
    BATCH = 50
    inserted = 0
    for i in range(0, len(rows), BATCH):
        batch = rows[i : i + BATCH]
        (
            client.table("golfers")
            .upsert(batch, on_conflict="name")
            .execute()
        )
        inserted += len(batch)
        print(f"    Upserted {inserted}/{len(rows)} players…")

    print(f"\n  ✓ Done! {len(players)} players are in Supabase.\n")
    print("  Next steps:")
    print("    1. Run  python seed_field.py --dry-run  to double-check tiers")
    print("    2. Visit /admin → verify the field looks correct")
    print("    3. /admin → Pool Settings → flip Submissions to Open")
    print("    4. Share the /submit link with your pool participants\n")


if __name__ == "__main__":
    main()
