#!/usr/bin/env python3
"""
sync_scores.py — Live score sync for the Masters Pool.

Scrapes the ESPN leaderboard every 5 minutes, matches golfers to the
Supabase `golfers` table, and pushes updated scores and statuses.

Rules:
  • A player whose status changes to 'cut' has their score FROZEN.
    Subsequent syncs will not overwrite it.
  • A player whose status changes to 'wd' or 'dq' is flagged, causing
    every pool entry that picked them to be disqualified on the leaderboard.

Usage:
    python sync_scores.py           # run forever (Ctrl-C to stop)
    python sync_scores.py --once    # run a single sync and exit
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime, timezone
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from fuzzywuzzy import fuzz, process
from supabase import create_client, Client

load_dotenv()

# ─── Config ───────────────────────────────────────────────────────────────────

ESPN_LEADERBOARD_URL = "https://www.espn.com/golf/leaderboard"
SYNC_INTERVAL_SECONDS = 5 * 60  # 5 minutes

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Cache-Control": "no-cache",
}


# ─── ESPN scraping ────────────────────────────────────────────────────────────

class ESPNPlayer:
    def __init__(self, name: str, score: int, status: str,
                 round_scores: list[int], best_round: Optional[int],
                 best_round_num: Optional[int]):
        self.name = name
        self.score = score           # cumulative score to par (e.g. -15)
        self.status = status         # 'active' | 'cut' | 'wd' | 'dq'
        self.round_scores = round_scores  # gross scores per round [68, 65, …]
        self.best_round = best_round     # best single-round score to par
        self.best_round_num = best_round_num  # which round (1-4)

    def __repr__(self):
        return f"ESPNPlayer({self.name!r}, score={self.score}, status={self.status!r})"


def parse_score_str(s: str) -> tuple[Optional[int], str]:
    """
    Parse an ESPN score string into (score_int, status).
    Returns (None, status) for non-numeric statuses.
    """
    s = s.strip().upper()
    if s in ("CUT", "MC", "MDF"):
        return None, "cut"
    if s in ("WD", "W/D", "WITHDRAWN"):
        return None, "wd"
    if s in ("DQ", "DISQUALIFIED"):
        return None, "dq"
    if s == "E":
        return 0, "active"
    if s in ("-", "--", "", "N/A"):
        return None, "active"  # not yet started
    try:
        return int(s), "active"
    except ValueError:
        return None, "active"


def _par_to_int(gross: int, par: int = 72) -> int:
    return gross - par


def _extract_round_scores(comp: dict) -> tuple[list[int], Optional[int], Optional[int]]:
    """
    Extract round-by-round gross scores from an ESPN competitor dict.
    Returns (round_scores_gross, best_round_to_par, best_round_num).
    """
    round_scores: list[int] = []
    for key in ["linescores", "rounds"]:
        rounds_data = comp.get(key, [])
        if rounds_data:
            for r in rounds_data:
                gross = r.get("value") or r.get("score") or r.get("displayValue")
                if gross and str(gross).isdigit():
                    round_scores.append(int(gross))
            break

    if not round_scores:
        return [], None, None

    par_scores = [s - 72 for s in round_scores]  # rough approximation
    best_par = min(par_scores)
    best_num = par_scores.index(best_par) + 1
    return round_scores, best_par, best_num


def scrape_leaderboard() -> list[ESPNPlayer]:
    """Scrape ESPN leaderboard and return a list of ESPNPlayer objects."""
    resp = requests.get(ESPN_LEADERBOARD_URL, headers=HEADERS, timeout=20)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "lxml")

    players: list[ESPNPlayer] = []

    # ── Strategy 1: embedded JSON ─────────────────────────────────────────────
    data = _try_extract_json(soup)
    if data:
        competitors = (
            data.get("page", {}).get("content", {}).get("leaderboard", {}).get("competitors")
            or data.get("page", {}).get("content", {}).get("tournament", {}).get("competitors")
            or []
        )
        for comp in competitors:
            name = (
                comp.get("displayName")
                or (comp.get("athlete") or {}).get("displayName")
                or comp.get("name")
                or ""
            ).strip()
            if not name:
                continue

            score_raw = (
                comp.get("score", {}).get("displayValue")
                or comp.get("total")
                or comp.get("totalScore")
                or "0"
            )
            status_raw = (
                (comp.get("status") or {}).get("type", {}).get("description", "")
                or ""
            )

            if "cut" in status_raw.lower():
                score_val, status = None, "cut"
            elif "withdraw" in status_raw.lower():
                score_val, status = None, "wd"
            elif "disqualif" in status_raw.lower():
                score_val, status = None, "dq"
            else:
                score_val, status = parse_score_str(str(score_raw))

            round_scores, best_round, best_round_num = _extract_round_scores(comp)
            players.append(ESPNPlayer(
                name=name,
                score=score_val if score_val is not None else 0,
                status=status,
                round_scores=round_scores,
                best_round=best_round,
                best_round_num=best_round_num,
            ))

        if len(players) >= 10:
            return players

    # ── Strategy 2: HTML table ────────────────────────────────────────────────
    players = []
    for row in soup.select("tr.Table__TR, tr[class*='Table__TR']"):
        cells = row.find_all("td")
        if len(cells) < 3:
            continue
        name_el = row.find("a", href=re.compile(r"/golf/player"))
        if not name_el:
            continue
        name = name_el.get_text(strip=True)
        if not name or len(name) < 3:
            continue

        # Score to par is typically the 3rd column (index 2)
        score_text = cells[2].get_text(strip=True)
        score_val, status = parse_score_str(score_text)

        players.append(ESPNPlayer(
            name=name,
            score=score_val if score_val is not None else 0,
            status=status,
            round_scores=[],
            best_round=None,
            best_round_num=None,
        ))

    return players


def _try_extract_json(soup: BeautifulSoup) -> Optional[dict]:
    for script in soup.find_all("script"):
        text = script.string or ""
        if "__espnfitt__" not in text:
            continue
        for pat in [
            r"window\[['\"]\s*__espnfitt__\s*['\"]\]\s*=\s*(\{.+?\})\s*;",
            r"window\.__espnfitt__\s*=\s*(\{.+?\})\s*;",
        ]:
            m = re.search(pat, text, re.DOTALL)
            if m:
                try:
                    return json.loads(m.group(1))
                except (json.JSONDecodeError, ValueError):
                    pass
    return None


# ─── Name matching ────────────────────────────────────────────────────────────

def find_db_golfer(
    espn_name: str,
    db_golfers: list[dict],
    threshold: int = 75,
) -> Optional[dict]:
    """Find the best DB golfer match for an ESPN player name."""
    db_names = [g["name"] for g in db_golfers]
    name_to_golfer = {g["name"]: g for g in db_golfers}

    # Exact match
    if espn_name in name_to_golfer:
        return name_to_golfer[espn_name]

    # Exact last-name match
    espn_last = espn_name.split()[-1].lower()
    last_matches = [g for g in db_golfers if g["name"].split()[-1].lower() == espn_last]
    if len(last_matches) == 1:
        return last_matches[0]

    # Fuzzy match
    result = process.extractOne(espn_name, db_names, scorer=fuzz.token_sort_ratio)
    if result and result[1] >= threshold:
        return name_to_golfer[result[0]]

    return None


# ─── Sync logic ───────────────────────────────────────────────────────────────

def run_sync(client: Client) -> int:
    """
    Run one sync cycle.  Returns the number of records changed.
    """
    # Fetch current DB state
    db_result = client.table("golfers").select("id, name, current_score, status").execute()
    db_golfers: list[dict] = db_result.data or []
    if not db_golfers:
        print("  ⚠  No golfers in database — run seed_field.py first.")
        return 0

    # Scrape ESPN
    espn_players = scrape_leaderboard()
    if not espn_players:
        print("  ⚠  No players found on ESPN leaderboard (tournament not live yet?).")
        return 0

    changed = 0
    updates: list[dict] = []

    for espn in espn_players:
        db_golfer = find_db_golfer(espn.name, db_golfers)
        if not db_golfer:
            continue  # player not in our pool

        # Rule: never update a cut player's score (freeze it)
        if db_golfer["status"] == "cut":
            continue

        new_score = espn.score
        new_status = espn.status

        score_changed = new_score != db_golfer["current_score"]
        status_changed = new_status != db_golfer["status"]

        if score_changed or status_changed:
            update: dict = {"id": db_golfer["id"]}
            # For cut/wd/dq: don't update score (keep whatever they had)
            if new_status in ("cut", "wd", "dq"):
                update["status"] = new_status
                # Freeze score — only update status
                if new_status != db_golfer["status"]:
                    changed += 1
                    updates.append(update)
            else:
                update["current_score"] = new_score
                update["status"] = new_status
                if espn.best_round is not None:
                    update["best_round_score"] = espn.best_round
                    update["best_round_num"] = espn.best_round_num
                changed += 1
                updates.append(update)

    # Batch updates
    for upd in updates:
        golfer_id = upd.pop("id")
        if upd:
            client.table("golfers").update(upd).eq("id", golfer_id).execute()

    # Update pool_settings.last_synced_at and round_low_label
    settings_update: dict = {"last_synced_at": datetime.now(tz=timezone.utc).isoformat()}

    # Compute round low: best individual round score across all synced players
    all_best = [
        (p, p.best_round, p.best_round_num)
        for p in espn_players
        if p.best_round is not None
    ]
    if all_best:
        best = min(all_best, key=lambda x: x[1])
        best_player, best_score, best_round = best
        score_str = str(best_score) if best_score >= 0 else str(best_score)
        if best_score == 0:
            score_str = "E"
        elif best_score > 0:
            score_str = f"+{best_score}"
        # Count how many pool entries have this golfer
        entries_res = client.table("entries").select(
            "id, tier1_golfer_id, tier2_golfer_id, tier3_golfer_id, "
            "tier4_golfer_id, tier5_golfer_id, tier6_golfer_id"
        ).execute()
        golfer_res = client.table("golfers").select("id, name").eq("name", best_player.name).execute()
        golfer_id = (golfer_res.data or [{}])[0].get("id")
        entries_with_player = 0
        if golfer_id:
            entries_with_player = sum(
                1 for e in (entries_res.data or [])
                if golfer_id in [
                    e.get("tier1_golfer_id"), e.get("tier2_golfer_id"),
                    e.get("tier3_golfer_id"), e.get("tier4_golfer_id"),
                    e.get("tier5_golfer_id"), e.get("tier6_golfer_id"),
                ]
            )
        label = f"{best_player.name} {score_str} (R{best_round})"
        if entries_with_player:
            label += f" · {entries_with_player} {'entry' if entries_with_player == 1 else 'entries'}"
        settings_update["round_low_label"] = label

    client.table("pool_settings").update(settings_update).eq("id", 1).execute()

    return changed


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Sync live Masters scores from ESPN to Supabase.")
    parser.add_argument("--once", action="store_true", help="Run a single sync and exit.")
    args = parser.parse_args()

    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not supabase_key:
        print(
            "ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY "
            "must be set in .env"
        )
        sys.exit(1)

    client: Client = create_client(supabase_url, supabase_key)  # type: ignore[arg-type]

    print("\n╔══════════════════════════════════════╗")
    print("║   Masters Pool — Live Score Sync     ║")
    print("╚══════════════════════════════════════╝")
    print(f"  Interval: {'one-shot' if args.once else f'{SYNC_INTERVAL_SECONDS // 60} min'}")
    print("  Press Ctrl-C to stop.\n")

    cycle = 0
    while True:
        cycle += 1
        ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            changed = run_sync(client)
            print(f"  [{ts}] Sync #{cycle} complete — {changed} score(s) changed")
        except requests.HTTPError as e:
            print(f"  [{ts}] HTTP error: {e}")
        except Exception as e:
            print(f"  [{ts}] Error: {e}")

        if args.once:
            break

        print(f"  Next sync in {SYNC_INTERVAL_SECONDS // 60} minutes…\n")
        try:
            time.sleep(SYNC_INTERVAL_SECONDS)
        except KeyboardInterrupt:
            print("\n  Stopped by user.\n")
            break


if __name__ == "__main__":
    main()
