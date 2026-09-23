"""Fetch Compute Atlas and roll it up by US state.

Compute Atlas (https://www.compute-atlas.com, CC-BY 4.0) is an open, source-cited
dataset of US data centers. This script:

  1. downloads the full facility list from the public API (or reads a local file),
  2. keeps `facilityType == "data_center"` records and saves them to
     ../data/compute-atlas/raw/facilities.json,
  3. writes ../data/compute-atlas/by_state.json following docs/data-model.md §2.

Run with `python3 compute_atlas.py` from this directory. Pass `--from FILE` to
skip the network and use a previously downloaded facilities.json.
"""

from __future__ import annotations

import argparse
import json
import urllib.request
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

API = "https://www.compute-atlas.com/api/facilities"
STATS = "https://www.compute-atlas.com/api/stats"
OUT_DIR = Path(__file__).resolve().parent.parent / "data" / "compute-atlas"
RAW = OUT_DIR / "raw" / "facilities.json"
OUT = OUT_DIR / "by_state.json"

PIPELINE = ("proposed", "permitted", "under_construction")
AI = ("confirmed", "likely")
PUSHBACK = ("contested", "opposed", "litigation")
ATTRIBUTION = "Kubiak, E. Compute Atlas [Data set]. https://doi.org/10.5281/zenodo.22284476 (CC-BY 4.0)"


def get(url: str) -> dict:
    req = urllib.request.Request(url, headers={"User-Agent": "states-of-ai/0.1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def fetch() -> dict:
    payload = get(API)
    payload["edition"] = get(STATS).get("edition")
    return payload


def year_of(s: str | None) -> int | None:
    return int(s[:4]) if s and s[:4].isdigit() else None


def first_operational_year(f: dict) -> int | None:
    dates = [h.get("date") for h in f.get("statusHistory", []) if h.get("status") == "operational"]
    return year_of(min(dates)) if dates else None


def mw(f: dict, key: str) -> float | None:
    v = (f.get("capacityMw") or {}).get(key)
    return float(v) if v is not None else None


def rollup(sites: list[dict], years: list[int]) -> dict:
    by_status = Counter(f["status"] for f in sites)
    operational = [f for f in sites if f["status"] == "operational"]
    pipeline = [f for f in sites if f["status"] in PIPELINE]

    op_disclosed = [f for f in operational if mw(f, "operational") is not None]
    pipe_disclosed = [f for f in pipeline if mw(f, "planned") is not None]

    # Owner share: weight by disclosed MW, fall back to site count.
    by_mw: dict[str, float] = defaultdict(float)
    by_n: Counter = Counter()
    for f in operational:
        by_n[f["operator"]] += 1
        if (v := mw(f, "operational")) is not None:
            by_mw[f["operator"]] += v
    use_mw = len(op_disclosed) >= max(3, len(operational) // 2)
    weights = by_mw if use_mw else {k: float(v) for k, v in by_n.items()}
    total_w = sum(weights.values()) or 1.0
    owner_share = sorted(
        ({"operator": k, "sites": by_n[k], "mw": round(by_mw.get(k, 0)), "pct": round(100 * w / total_w)}
         for k, w in weights.items()),
        key=lambda o: (-o["pct"], o["operator"]),
    )

    # Growth: cumulative operational sites and disclosed MW by first operational year.
    dated = [(first_operational_year(f), f) for f in operational]
    undated = sum(1 for y, _ in dated if y is None)
    growth = []
    for y in years:
        upto = [f for yy, f in dated if yy is not None and yy <= y]
        growth.append({"year": y, "sites": len(upto),
                       "mw": round(sum(mw(f, "operational") or 0 for f in upto))})

    pushback = [f for f in sites if (f.get("community") or {}).get("status") in PUSHBACK]
    subsidised = [f for f in sites if f.get("subsidies")]
    subsidy_total = sum(s.get("amountUsd") or 0 for f in subsidised for s in f["subsidies"])

    publishers = Counter(s.get("publisher") for f in sites for s in f.get("sources", []) if s.get("publisher"))

    def site_row(f: dict) -> dict:
        c = f.get("community") or {}
        src = f.get("sources", [])
        return {
            "id": f["id"], "name": f["name"], "operator": f["operator"],
            "status": f["status"], "confidence": f["confidence"],
            "ai": f.get("aiClassification"),
            "city": f["location"].get("city"), "county": f["location"].get("county"),
            "lat": f["location"].get("lat"), "lon": f["location"].get("lon"),
            "operational_mw": mw(f, "operational"), "planned_mw": mw(f, "planned"),
            "first_operational_year": first_operational_year(f),
            "announced": f.get("announcedDate"),
            "community_status": c.get("status"), "community_notes": c.get("notes"),
            "subsidies": f.get("subsidies") or [],
            "utility": (f.get("energy") or {}).get("utility"),
            "cooling": (f.get("water") or {}).get("coolingType"),
            "source_url": src[0]["url"] if src else None,
            "source_count": len(src),
            "last_updated": f.get("lastUpdated"),
        }

    return {
        "sites": {"total": len(sites), **{s: by_status.get(s, 0) for s in
                  ("operational", "under_construction", "permitted", "proposed", "cancelled")}},
        "ai_sites": sum(1 for f in sites if f.get("aiClassification") in AI),
        "ai_sites_mixed": sum(1 for f in sites if f.get("aiClassification") == "mixed_use"),
        "operational_mw": {"value": round(sum(mw(f, "operational") for f in op_disclosed)),
                           "disclosed": len(op_disclosed), "of": len(operational)},
        "pipeline_mw": {"value": round(sum(mw(f, "planned") for f in pipe_disclosed)),
                        "disclosed": len(pipe_disclosed), "of": len(pipeline)},
        "growth": growth,
        "growth_undated_sites": undated,
        "owner_share": owner_share[:8],
        "owner_share_basis": "mw" if use_mw else "sites",
        "pushback": {"count": len(pushback), "sites": [
            {"name": f["name"], "place": f["location"].get("city") or f["location"].get("county"),
             "status": f["community"]["status"], "note": f["community"].get("notes"),
             "source_url": (f.get("sources") or [{}])[0].get("url")} for f in pushback]},
        "incentives": {"active": bool(subsidised), "sites": len(subsidised),
                       "amount_usd": subsidy_total,
                       "programs": sorted({s["program"] for f in subsidised for s in f["subsidies"] if s.get("program")})},
        "publishers": [p for p, _ in publishers.most_common(6)],
        "verified": max((f.get("lastUpdated") or "" for f in sites), default=None),
        "facilities": sorted((site_row(f) for f in sites),
                             key=lambda r: (-(r["operational_mw"] or 0), r["name"])),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--from", dest="src", type=Path, help="local facilities.json instead of the API")
    args = ap.parse_args()

    payload = json.load(open(args.src)) if args.src else fetch()
    all_recs = payload["facilities"] if isinstance(payload, dict) else payload
    dcs = [f for f in all_recs if f.get("facilityType") == "data_center"
           and f["location"].get("state") and f["status"] != "pending"]

    RAW.parent.mkdir(parents=True, exist_ok=True)
    RAW.write_text(json.dumps(dcs, indent=1) + "\n")

    years = list(range(2016, date.today().year + 1))
    by_state: dict[str, list[dict]] = defaultdict(list)
    for f in dcs:
        by_state[f["location"]["state"]].append(f)

    states = {st: rollup(sites, years) for st, sites in sorted(by_state.items())}
    doc = {
        "source": "Compute Atlas", "attribution": ATTRIBUTION,
        "fetched": date.today().isoformat(),
        "edition": payload.get("edition") if isinstance(payload, dict) else None,
        "records": len(dcs),
        "all_states": {
            "max_operational_mw": max(s["operational_mw"]["value"] for s in states.values()),
            "median_operational_mw": sorted(s["operational_mw"]["value"] for s in states.values())[len(states) // 2],
            "max_sites": max(s["sites"]["total"] for s in states.values()),
        },
        "states": states,
    }
    OUT.write_text(json.dumps(doc, indent=1) + "\n")
    print(f"{len(dcs)} data center records across {len(states)} states -> {OUT}")


if __name__ == "__main__":
    main()
