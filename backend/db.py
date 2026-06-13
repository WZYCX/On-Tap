import os
from contextlib import closing

import psycopg


def _get_database_url() -> str:
    database_url = os.getenv("SUPABASE_DB_URL")
    if not database_url:
        raise RuntimeError("SUPABASE_DB_URL is not set.")
    return database_url


def fetch_healthcheck() -> int:
    with closing(psycopg.connect(_get_database_url())) as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1;")
            row = cursor.fetchone()

    if row is None:
        raise RuntimeError("No rows returned from healthcheck query.")

    return int(row[0])
