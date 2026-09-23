"""Fixture-first ingestion for States of AI.

Run with `python ingest.py`, or `uv run python ingest.py` when uv is installed.
It emits a Convex-shaped JSON import under ../data. If LEGISCAN_API_KEY is set,
--source auto (the default) asks LegiScan's getSearch endpoint for each state
and falls back to fixtures for a failed response.
"""

from __future__ import annotations

import argparse
import json
import os
import urllib.parse
import urllib.request
from datetime import UTC, datetime
from pathlib import Path

STATES = [
    ("AL", "Alabama"), ("AK", "Alaska"), ("AZ", "Arizona"), ("AR", "Arkansas"),
    ("CA", "California"), ("CO", "Colorado"), ("CT", "Connecticut"), ("DE", "Delaware"),
    ("FL", "Florida"), ("GA", "Georgia"), ("HI", "Hawaii"), ("ID", "Idaho"),
    ("IL", "Illinois"), ("IN", "Indiana"), ("IA", "Iowa"), ("KS", "Kansas"),
    ("KY", "Kentucky"), ("LA", "Louisiana"), ("ME", "Maine"), ("MD", "Maryland"),
    ("MA", "Massachusetts"), ("MI", "Michigan"), ("MN", "Minnesota"), ("MS", "Mississippi"),
    ("MO", "Missouri"), ("MT", "Montana"), ("NE", "Nebraska"), ("NV", "Nevada"),
    ("NH", "New Hampshire"), ("NJ", "New Jersey"), ("NM", "New Mexico"), ("NY", "New York"),
    ("NC", "North Carolina"), ("ND", "North Dakota"), ("OH", "Ohio"), ("OK", "Oklahoma"),
    ("OR", "Oregon"), ("PA", "Pennsylvania"), ("RI", "Rhode Island"), ("SC", "South Carolina"),
    ("SD", "South Dakota"), ("TN", "Tennessee"), ("TX", "Texas"), ("UT", "Utah"),
    ("VT", "Vermont"), ("VA", "Virginia"), ("WA", "Washington"), ("WV", "West Virginia"),
    ("WI", "Wisconsin"), ("WY", "Wyoming"), ("DC", "District of Columbia"),
]

ACTIVE_BILLS = {
    "CA": [("SB 53", "Frontier Artificial Intelligence Models: Safety and Security", "enacted"),
           ("AB 2013", "Generative Artificial Intelligence: Training Data Transparency", "enacted"),
           ("SB 1047", "Safe and Secure Innovation for Frontier Artificial Intelligence Models", "proposed")],
    "CO": [("SB 24-205", "Consumer Protections for Artificial Intelligence", "enacted"),
           ("HB 25-1260", "Artificial Intelligence Consumer Protection Amendments", "proposed")],
    "TX": [("HB 149", "Texas Responsible Artificial Intelligence Governance Act", "enacted"),
           ("SB 1966", "Artificial Intelligence: Biometric Identifier Protections", "proposed")],
    "VA": [("HB 2094", "High-Risk Artificial Intelligence Developer and Deployer Act", "proposed"),
           ("SB 1051", "Synthetic Media: Election Communications", "enacted")],
    "NY": [("S 6955", "New York Artificial Intelligence Consumer Protection Act", "proposed")],
    "IL": [("HB 3773", "Artificial Intelligence Systems and Consumer Rights", "proposed")],
    "UT": [("SB 149", "Artificial Intelligence Policy Act Amendments", "enacted")],
}

FACILITIES = [
    {"external_id": "va-ashburn-01", "name": "Digital Campus Ashburn", "state": "VA", "city": "Ashburn", "capacity_mw": 360, "status": "operational", "operator": "Hyperscale campus"},
    {"external_id": "va-pwc-01", "name": "Innovation Park Campus", "state": "VA", "city": "Manassas", "capacity_mw": 300, "status": "announced", "operator": "Cloud developer"},
    {"external_id": "tx-temple-01", "name": "Temple AI Compute Campus", "state": "TX", "city": "Temple", "capacity_mw": 180, "status": "construction", "operator": "Compute infrastructure developer"},
    {"external_id": "oh-new-albany-01", "name": "New Albany Data Campus", "state": "OH", "city": "New Albany", "capacity_mw": 120, "status": "construction", "operator": "Hyperscale campus"},
    {"external_id": "ia-council-bluffs-01", "name": "Council Bluffs Campus", "state": "IA", "city": "Council Bluffs", "capacity_mw": 200, "status": "operational", "operator": "Technology company"},
    {"external_id": "wa-quincy-01", "name": "Quincy Cloud Campus", "state": "WA", "city": "Quincy", "capacity_mw": 140, "status": "operational", "operator": "Technology company"},
]


def fixture_bill(state: str, number: str, title: str, product_status: str, bill_id: int) -> dict:
    enacted = product_status == "enacted"
    last_action = "Signed by the Governor" if enacted else "Referred to committee"
    return {
        "bill_id": bill_id, "number": number, "title": title, "status": 4 if enacted else 2,
        "status_date": "2025-06-22", "last_action": last_action, "last_action_date": "2025-06-22",
        "url": f"https://legiscan.com/{state}/bill/{number.replace(' ', '')}/{bill_id}",
        "state": state, "chamber": "Senate" if number.startswith("S") else "House",
        "session": "2025-2026 Regular Session",
        "history": [{"date": "2025-01-14", "action": "Introduced and referred to committee", "chamber": "House"}, {"date": "2025-06-22", "action": last_action, "chamber": "House"}],
        "sponsors": [{"name": "Primary sponsor", "party": "Bipartisan", "role": "Sponsor"}],
        "texts": [{"date": "2025-01-14", "type": "Introduced", "url": f"https://legiscan.com/{state}/text/{bill_id}"}],
        "progress": [{"event_date": "2025-01-14", "event": 1, "event_text": "Introduced"}, {"event_date": "2025-06-22", "event": 4 if enacted else 2, "event_text": last_action}],
        "product_status": product_status,
    }


def fixture_bills(state: str) -> list[dict]:
    return [fixture_bill(state, number, title, status, 900000 + index) for index, (number, title, status) in enumerate(ACTIVE_BILLS.get(state, []))]


def legiscan_bills(state: str, key: str) -> list[dict]:
    query = urllib.parse.urlencode({"op": "getSearch", "key": key, "state": state, "query": "artificial intelligence"})
    with urllib.request.urlopen(f"https://api.legiscan.com/?{query}", timeout=20) as response:
        payload = json.load(response)
    records = payload.get("searchresult", {}) if payload.get("status") == "OK" else {}
    return [{**record, "state": state, "product_status": "enacted" if int(record.get("status", 0)) >= 4 else "proposed"}
            for name, record in records.items() if name != "summary" and isinstance(record, dict)]


def get_bills(state: str, source: str) -> list[dict]:
    key = os.getenv("LEGISCAN_API_KEY")
    if source == "fixture" or not key:
        return fixture_bills(state)
    try:
        return legiscan_bills(state, key)
    except Exception as exc:  # Fixture fallback is deliberate for offline/reliable runs.
        print(f"{state}: LegiScan unavailable ({exc}); using fixtures")
        return fixture_bills(state)


def post_to_convex(ingest_url: str, document: dict) -> None:
    token = os.getenv("CONVEX_INGEST_TOKEN")
    if not token:
        raise RuntimeError("CONVEX_INGEST_TOKEN is required when CONVEX_INGEST_URL is set")
    request = urllib.request.Request(
        ingest_url,
        data=json.dumps(document).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=30) as response:
        print(f"Convex ingest response: {response.status}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", choices=("auto", "fixture", "legiscan"), default="auto")
    parser.add_argument("--output", type=Path, default=Path("../data/mock-convex-import.json"))
    args = parser.parse_args()

    source = "fixture" if args.source == "fixture" else ("legiscan" if os.getenv("LEGISCAN_API_KEY") else "fixture")
    document = {
        "generated_at": datetime.now(UTC).isoformat(),
        "source": source,
        "states": [{"code": code, "name": name} for code, name in STATES],
        "bills": [bill for code, _ in STATES for bill in get_bills(code, source)],
        "datacenters": FACILITIES,
    }
    destination = (Path(__file__).parent / args.output).resolve()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(document, indent=2) + "\n")
    print(f"Wrote {len(document['states'])} states, {len(document['bills'])} bills, and {len(FACILITIES)} facilities to {destination}")

    if ingest_url := os.getenv("CONVEX_INGEST_URL"):
        post_to_convex(ingest_url, document)


if __name__ == "__main__":
    main()
