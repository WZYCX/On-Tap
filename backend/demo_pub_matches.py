import csv
from functools import lru_cache
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any

CSV_PATH = Path(__file__).resolve().parent / "database" / "nearby.csv"
FAVOURITE_DRINK_CONFIDENCE_THRESHOLD = 0.5
MAX_DISTANCE_FOR_COORDINATE_MATCH_METERS = 30
EARTH_RADIUS_METERS = 6_371_000
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


def _normalize_lookup_key(value: str | None) -> str:
    return (value or "").strip().casefold()


def _haversine_distance_meters(
    origin_lat: float,
    origin_lng: float,
    destination_lat: float,
    destination_lng: float,
) -> int:
    origin_lat_rad = radians(origin_lat)
    destination_lat_rad = radians(destination_lat)
    lat_delta_rad = radians(destination_lat - origin_lat)
    lng_delta_rad = radians(destination_lng - origin_lng)

    haversine = (
        sin(lat_delta_rad / 2) ** 2
        + cos(origin_lat_rad) * cos(destination_lat_rad) * sin(lng_delta_rad / 2) ** 2
    )
    arc = 2 * asin(sqrt(haversine))
    return round(EARTH_RADIUS_METERS * arc)


@lru_cache(maxsize=1)
def _build_confidence_lookup() -> tuple[
    dict[str, dict[str, float | None]],
    list[dict[str, Any]],
]:
    name_lookup: dict[str, dict[str, float | None]] = {}
    coordinate_rows: list[dict[str, Any]] = []

    with CSV_PATH.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            confidence_scores = {
                public_name: _parse_float(row.get(csv_name))
                for public_name, csv_name in CONFIDENCE_FIELD_MAP.items()
            }
            pub_name = _normalize_lookup_key(row.get("name"))
            lat = _parse_float(row.get("lat"))
            lng = _parse_float(row.get("lng"))

            if pub_name:
                name_lookup[pub_name] = confidence_scores
            if lat is not None and lng is not None:
                coordinate_rows.append(
                    {
                        "lat": lat,
                        "lng": lng,
                        "confidence_scores": confidence_scores,
                    }
                )

    return name_lookup, coordinate_rows


def _empty_confidence_scores() -> dict[str, float | None]:
    return {field_name: None for field_name in CONFIDENCE_FIELD_MAP}


def _find_coordinate_match(
    lat: float | None,
    lng: float | None,
    coordinate_rows: list[dict[str, Any]],
) -> dict[str, float | None] | None:
    if lat is None or lng is None:
        return None

    best_match: dict[str, Any] | None = None
    best_distance: int | None = None

    for row in coordinate_rows:
        distance_m = _haversine_distance_meters(
            origin_lat=lat,
            origin_lng=lng,
            destination_lat=float(row["lat"]),
            destination_lng=float(row["lng"]),
        )
        if best_distance is None or distance_m < best_distance:
            best_distance = distance_m
            best_match = row

    if best_match is None or best_distance is None:
        return None

    if best_distance > MAX_DISTANCE_FOR_COORDINATE_MATCH_METERS:
        return None

    return best_match["confidence_scores"]


def enrich_pubs_with_demo_drink_data(pubs: list[dict[str, Any]]) -> list[dict[str, Any]]:
    confidence_lookup_by_name, coordinate_rows = _build_confidence_lookup()
    enriched_pubs: list[dict[str, Any]] = []

    for pub in pubs:
        pub_name = _normalize_lookup_key(pub.get("name"))
        confidence_scores = confidence_lookup_by_name.get(pub_name) if pub_name else None

        if confidence_scores is None:
            confidence_scores = _find_coordinate_match(
                lat=_parse_float(str(pub.get("lat"))) if pub.get("lat") is not None else None,
                lng=_parse_float(str(pub.get("lng"))) if pub.get("lng") is not None else None,
                coordinate_rows=coordinate_rows,
            )

        if confidence_scores is None:
            confidence_scores = _empty_confidence_scores()

        guinness_confidence = confidence_scores.get("guinness")

        enriched_pubs.append(
            {
                "name": pub.get("name"),
                "lat": pub.get("lat"),
                "lng": pub.get("lng"),
                "address": pub.get("address"),
                "rating": pub.get("rating"),
                "user_rating_count": pub.get("user_rating_count"),
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
