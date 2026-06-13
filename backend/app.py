import logging
import os

from flask import Flask, jsonify, request
from dotenv import load_dotenv

from demo_pub_matches import enrich_pubs_with_demo_drink_data
from pub_finder import PubFinderError, find_nearest_pubs

load_dotenv()
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger(__name__)

DEFAULT_PUB_LIMIT = 2


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/find-pub")
    def find_pub() -> tuple[object, int]:
        lat_param = request.args.get("lat")
        lng_param = request.args.get("lng")

        if lat_param is None or lng_param is None:
            return jsonify({"message": "lat and lng query params are required."}), 400

        try:
            lat = float(lat_param)
            lng = float(lng_param)
        except ValueError:
            return jsonify({"message": "lat and lng must be valid numbers."}), 400

        if not -90 <= lat <= 90:
            return jsonify({"message": "lat must be between -90 and 90."}), 400

        if not -180 <= lng <= 180:
            return jsonify({"message": "lng must be between -180 and 180."}), 400

        logger.info("Fetching pubs with fixed limit=%s", DEFAULT_PUB_LIMIT)
        try:
            pubs = find_nearest_pubs(lat=lat, lng=lng, limit=DEFAULT_PUB_LIMIT)
        except PubFinderError as exc:
            return jsonify({"message": str(exc)}), 502

        enriched_pubs = enrich_pubs_with_demo_drink_data(pubs)
        logger.info("Returning %s pubs enriched from demo CSV", len(enriched_pubs))
        return jsonify(enriched_pubs), 200

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5002, debug=os.getenv("FLASK_DEBUG") == "1")
