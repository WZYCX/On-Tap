# OSM pub export

This folder is isolated from the live app code.

`export_local_pubs.py` queries OpenStreetMap via the Overpass API for POIs tagged `amenity=pub` inside a bounding box, then writes the results to `local-pubs.csv`.

Default run:

```bash
python3 backend/osm_pub_export/export_local_pubs.py
```

Custom bbox:

```bash
python3 backend/osm_pub_export/export_local_pubs.py --bbox 51.30 -0.30 51.65 0.10
```

Custom output path:

```bash
python3 backend/osm_pub_export/export_local_pubs.py --output /tmp/local-pubs.csv
```

Notes:

- The default bbox is an approximate Greater London bounding box.
- The script only pulls `amenity=pub`. If you want bars, taprooms, or beer gardens included, widen the query deliberately rather than mixing them into the initial export.
- Overpass is free but rate-limited. Large or repeated runs may need retries or a narrower bbox.
