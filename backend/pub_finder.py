import json
from functools import lru_cache
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from typing import Any

DEFAULT_SEARCH_LIMIT = 3
EARTH_RADIUS_METERS = 6_371_000
EXPORT_JSON_PATH = Path(__file__).resolve().parent / "database" / "export.json"


class PubFinderError(RuntimeError):
    pass


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


def _first_present_tag(tags: dict[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = tags.get(key)
        if value:
            return str(value)
    return None


def _format_address(tags: dict[str, Any]) -> str | None:
    full_address = _first_present_tag(tags, "addr:full")
    if full_address:
        return full_address

    parts: list[str] = []
    house_number = _first_present_tag(tags, "addr:housenumber")
    street = _first_present_tag(tags, "addr:street")
    if house_number and street:
        parts.append(f"{house_number} {street}")
    elif street:
        parts.append(street)

    for key in ("addr:suburb", "addr:city", "addr:postcode"):
        value = _first_present_tag(tags, key)
        if value:
            parts.append(value)

    if not parts:
        return None

    return ", ".join(parts)


def _extract_coordinates(element: dict[str, Any]) -> tuple[float | None, float | None]:
    latitude = element.get("lat")
    longitude = element.get("lon")
    if latitude is not None and longitude is not None:
        return latitude, longitude

    center = element.get("center", {})
    return center.get("lat"), center.get("lon")


@lru_cache(maxsize=1)
def _load_pub_dataset() -> list[dict[str, Any]]:
    try:
        payload = json.loads(EXPORT_JSON_PATH.read_text(encoding="utf-8"))
    except OSError as exc:
        raise PubFinderError(f"Could not read pub dataset at {EXPORT_JSON_PATH}.") from exc
    except json.JSONDecodeError as exc:
        raise PubFinderError(f"Pub dataset at {EXPORT_JSON_PATH} is not valid JSON.") from exc

    elements = payload.get("elements")
    if not isinstance(elements, list):
        raise PubFinderError("Pub dataset is missing an elements list.")

    pubs: list[dict[str, Any]] = []
    for element in elements:
        if not isinstance(element, dict):
            continue

        tags = element.get("tags", {})
        if not isinstance(tags, dict):
            tags = {}

        latitude, longitude = _extract_coordinates(element)
        if latitude is None or longitude is None:
            continue

        pubs.append(
            {
                "name": _first_present_tag(tags, "name") or "Unknown pub",
                "lat": latitude,
                "lng": longitude,
                "address": _format_address(tags),
                "rating": None,
                "user_rating_count": None,
                "website_url": _first_present_tag(tags, "website", "contact:website", "url"),
                "is_open_now": None,
            }
        )

    return pubs


def find_nearest_pubs(lat: float, lng: float, limit: int = DEFAULT_SEARCH_LIMIT) -> list[dict[str, Any]]:
    if limit <= 0:
        return []

    pubs = _load_pub_dataset()
    ranked_pubs: list[dict[str, Any]] = []

    for pub in pubs:
        distance_m = _haversine_distance_meters(
            origin_lat=lat,
            origin_lng=lng,
            destination_lat=float(pub["lat"]),
            destination_lng=float(pub["lng"]),
        )
        ranked_pubs.append(
            {
                **pub,
                "straight_line_distance_m": distance_m,
            }
        )

    ranked_pubs.sort(key=lambda pub: (pub["straight_line_distance_m"], str(pub["name"]).casefold()))
    return ranked_pubs[:limit]
