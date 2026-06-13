import os

from flask import Flask, jsonify
from dotenv import load_dotenv
from psycopg import Error as PsycopgError

from db import fetch_healthcheck

load_dotenv()


def create_app() -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health() -> tuple[dict[str, str], int]:
        return {"status": "ok"}, 200

    @app.get("/db-health")
    def db_health() -> tuple[dict[str, str | int], int]:
        try:
            result = fetch_healthcheck()
            return jsonify({"status": "ok", "result": result}), 200
        except (RuntimeError, PsycopgError):
            return jsonify({"status": "error", "message": "Database query failed."}), 500

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=os.getenv("FLASK_DEBUG") == "1")
