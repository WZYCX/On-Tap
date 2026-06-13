#!/usr/bin/env python3
import argparse
import csv
from pathlib import Path
from typing import Any

import requests

OVERPASS_API_URL = "https://overpass-api.de/api/interpreter"
DEFAULT_OUTPUT_PATH = Path(__file__).resolve().parent / "local-pubs.csv"

# Approximate Greater London bbox: south, west, north, east.
DEFAULT_BBOX = (51.28, -0.51, 51.70, 0.33)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export OSM pubs inside a bounding box to a CSV file."
    )
    parser.add_argument(
        "--bbox",
        nargs=4,
        metavar=("SOUTH", "WEST", "NORTH", "EAST"),
        type=float,
        default=DEFAULT_BBOX,
        help="Bounding box to search. Defaults to an approximate Greater London bbox.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=DEFAULT_OUTPUT_PATH,
        help="CSV output path. Defaults to backend/osm_pub_export/local-pubs.csv.",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=120,
        help="Overpass query timeout in seconds.",
    )
    return parser.parse_args()


def build_query(south: float, west: float, north: float, east: float, timeout: int) -> str:
    return f"""
[out:json][timeout:{timeout}];
(
  node["amenity"="pub"]({south},{west},{north},{east});
  way["amenity"="pub"]({south},{west},{north},{east});
  relation["amenity"="pub"]({south},{west},{north},{east});
);
out center tags;
""".strip()


def fetch_pub_elements(query: str) -> list[dict[str, Any]]:
    response = requests.post(
        OVERPASS_API_URL,
        data={"data": query},
        timeout=180,
    )
    response.raise_for_status()
    payload = response.json()
    return payload.get("elements", [])


def get_coordinates(element: dict[str, Any]) -> tuple[float | None, float | None]:
    lat = element.get("lat")
    lon = element.get("lon")
    if lat is not None and lon is not None:
        return lat, lon

    center = element.get("center", {})
    return center.get("lat"), center.get("lon")


def first_present_tag(tags: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = tags.get(key)
        if value:
            return str(value)
    return ""


def format_address(tags: dict[str, Any]) -> str:
    full_address = first_present_tag(tags, "addr:full")
    if full_address:
        return full_address

    parts: list[str] = []
    house_number = first_present_tag(tags, "addr:housenumber")
    street = first_present_tag(tags, "addr:street")
    if house_number and street:
        parts.append(f"{house_number} {street}")
    elif street:
        parts.append(street)

    for key in ("addr:suburb", "addr:city", "addr:postcode"):
        value = first_present_tag(tags, key)
        if value:
            parts.append(value)

    return ", ".join(parts)


def build_osm_url(element_type: str, element_id: int | str) -> str:
    return f"https://www.openstreetmap.org/{element_type}/{element_id}"


def normalise_elements(elements: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []

    for element in elements:
        tags = element.get("tags", {})
        lat, lng = get_coordinates(element)
        rows.append(
            {
                "osm_type": str(element.get("type", "")),
                "osm_id": element.get("id", ""),
                "name": first_present_tag(tags, "name") or "Unknown pub",
                "amenity": first_present_tag(tags, "amenity"),
                "lat": lat,
                "lng": lng,
                "address": format_address(tags),
                "postcode": first_present_tag(tags, "addr:postcode"),
                "website_url": first_present_tag(tags, "website", "contact:website", "url"),
                "phone": first_present_tag(tags, "phone", "contact:phone"),
                "opening_hours": first_present_tag(tags, "opening_hours"),
                "brewery": first_present_tag(tags, "brewery"),
                "operator": first_present_tag(tags, "operator"),
                "osm_url": build_osm_url(
                    element_type=str(element.get("type", "")),
                    element_id=element.get("id", ""),
                ),
            }
        )

    rows.sort(key=lambda row: (str(row["name"]).casefold(), str(row["osm_type"]), str(row["osm_id"])))
    return rows


def write_csv(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "osm_type",
        "osm_id",
        "name",
        "amenity",
        "lat",
        "lng",
        "address",
        "postcode",
        "website_url",
        "phone",
        "opening_hours",
        "brewery",
        "operator",
        "osm_url",
    ]

    with output_path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    args = parse_args()
    south, west, north, east = args.bbox

    if not south < north:
        raise SystemExit("Invalid bbox: SOUTH must be less than NORTH.")
    if not west < east:
        raise SystemExit("Invalid bbox: WEST must be less than EAST.")

    query = build_query(
        south=south,
        west=west,
        north=north,
        east=east,
        timeout=args.timeout,
    )
    elements = fetch_pub_elements(query)
    rows = normalise_elements(elements)
    write_csv(rows=rows, output_path=args.output)

    print(f"Wrote {len(rows)} pubs to {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
