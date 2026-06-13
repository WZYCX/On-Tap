import os
from math import asin, cos, radians, sin, sqrt
from typing import Any

import requests

GOOGLE_PLACES_NEARBY_URL = "https://places.googleapis.com/v1/places:searchNearby"
DEFAULT_SEARCH_RADIUS_METERS = 5000.0
EARTH_RADIUS_METERS = 6_371_000
PUB_LIKE_PLACE_TYPES = {
    "pub": "Generic pub",
    "irish_pub": "Irish pub",
    "gastropub": "Gastropub",
    "brewpub": "Brewpub",
    "bar": "Bar",
    "bar_and_grill": "Bar and grill",
    "cocktail_bar": "Cocktail bar",
    "lounge_bar": "Lounge bar",
    "beer_garden": "Beer garden",
    "brewery": "Brewery",
}


class PubFinderError(RuntimeError):
    pass


def _get_google_maps_api_key() -> str:
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        raise PubFinderError("GOOGLE_MAPS_API_KEY is not set.")
    return api_key


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


def find_nearest_pubs(lat: float, lng: float, limit: int = 3) -> list[dict[str, Any]]:
    response = requests.post(
        GOOGLE_PLACES_NEARBY_URL,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": _get_google_maps_api_key(),
            "X-Goog-FieldMask": ",".join(
                [
                    "places.displayName",
                    "places.location",
                    "places.shortFormattedAddress",
                    "places.rating",
                    "places.userRatingCount",
                    "places.googleMapsUri",
                    "places.websiteUri",
                    "places.currentOpeningHours",
                ]
            ),
        },
        json={
            "includedTypes": list(PUB_LIKE_PLACE_TYPES.keys()),
            "maxResultCount": limit,
            "rankPreference": "DISTANCE",
            "locationRestriction": {
                "circle": {
                    "center": {
                        "latitude": lat,
                        "longitude": lng,
                    },
                    "radius": DEFAULT_SEARCH_RADIUS_METERS,
                }
            },
        },
        timeout=10,
    )

    try:
        response.raise_for_status()
    except requests.HTTPError as exc:
        raise PubFinderError("Pub lookup request failed.") from exc

    payload = response.json()
    results = payload.get("places", [])

    pubs: list[dict[str, Any]] = []
    for result in results:
        location = result.get("location", {})
        latitude = location.get("latitude")
        longitude = location.get("longitude")

        if latitude is None or longitude is None:
            continue

        pubs.append(
            {
                "name": result.get("displayName", {}).get("text", "Unknown pub"),
                "lat": latitude,
                "lng": longitude,
                "address": result.get("shortFormattedAddress"),
                "rating": result.get("rating"),
                "user_rating_count": result.get("userRatingCount"),
                "google_maps_url": result.get("googleMapsUri"),
                "website_url": result.get("websiteUri"),
                "is_open_now": result.get("currentOpeningHours", {}).get("openNow"),
                "straight_line_distance_m": _haversine_distance_meters(
                    origin_lat=lat,
                    origin_lng=lng,
                    destination_lat=latitude,
                    destination_lng=longitude,
                ),
            }
        )

    return pubs
