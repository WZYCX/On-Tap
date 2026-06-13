import csv
from pathlib import Path
from typing import Any

CSV_PATH = Path(__file__).resolve().parent / "database" / "nearby.csv"
FAVOURITE_DRINK_CONFIDENCE_THRESHOLD = 0.5
CONFIDENCE_FIELD_MAP = {
    "guinness": "guinness_confidence",
    "tv": "tv_confidence",
    "football": "football_confidence",
    "outdoor_seating": "outdoor_seating_confidence",
    "food": "food_confidence",
}


def _parse_float(value: str | None) -> float | None:
    if value is None or value == "":
        return None

    try:
        return float(value)
    except ValueError:
        return None


def _build_confidence_lookup() -> dict[str, dict[str, float | None]]:
    lookup: dict[str, dict[str, float | None]] = {}

    with CSV_PATH.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            google_maps_url = (row.get("google_maps_url") or "").strip()
            if not google_maps_url:
                continue

            lookup[google_maps_url] = {
                public_name: _parse_float(row.get(csv_name))
                for public_name, csv_name in CONFIDENCE_FIELD_MAP.items()
            }

    return lookup


def _empty_confidence_scores() -> dict[str, float | None]:
    return {field_name: None for field_name in CONFIDENCE_FIELD_MAP}


def enrich_pubs_with_demo_drink_data(pubs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    confidence_lookup = _build_confidence_lookup()
    enriched_pubs: list[dict[str, Any]] = []

    for pub in pubs:
        google_maps_url = str(pub.get("google_maps_url", "")).strip()
        confidence_scores = confidence_lookup.get(google_maps_url, _empty_confidence_scores())
        guinness_confidence = confidence_scores.get("guinness")

        enriched_pubs.append(
            {
                "name": pub.get("name"),
                "lat": pub.get("lat"),
                "lng": pub.get("lng"),
                "address": pub.get("address"),
                "rating": pub.get("rating"),
                "user_rating_count": pub.get("user_rating_count"),
                "google_maps_url": pub.get("google_maps_url"),
                "website_url": pub.get("website_url"),
                "is_open_now": pub.get("is_open_now"),
                "straight_line_distance_m": pub.get("straight_line_distance_m"),
                "confidence_scores": confidence_scores,
                "has_favourite_drink": bool(
                    guinness_confidence is not None
                    and guinness_confidence >= FAVOURITE_DRINK_CONFIDENCE_THRESHOLD
                ),
            }
        )

    return enriched_pubs
