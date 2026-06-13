import csv
import os
from pathlib import Path
import sys

LATITUDE = 51.530052
LONGITUDE = -0.075371
PUB_LIMIT = 20

ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT_DIR / "backend" / ".env"
OUTPUT_PATH = Path(__file__).resolve().parent / "nearby_pubs.csv"
sys.path.insert(0, str(ROOT_DIR / "backend"))

from pub_finder import find_nearest_pubs


def load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'\""))


def main() -> None:
    load_env_file(ENV_PATH)

    pubs = find_nearest_pubs(lat=LATITUDE, lng=LONGITUDE, limit=PUB_LIMIT)
    fieldnames = [
        "name",
        "address",
        "lat",
        "lng",
        "rating",
        "user_rating_count",
        "website_url",
        "is_open_now",
        "straight_line_distance_m",
    ]

    with OUTPUT_PATH.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(pubs)

    print(f"Wrote {len(pubs)} pubs to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
