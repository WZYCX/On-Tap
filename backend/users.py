import csv
from pathlib import Path

USERS_CSV_PATH = Path(__file__).resolve().parent / "database" / "users.csv"


class UserLookupError(RuntimeError):
    pass


def get_favourite_drink_for_user(email: str) -> str:
    normalized_email = email.strip().lower()

    with USERS_CSV_PATH.open(newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            if row.get("email", "").strip().lower() == normalized_email:
                favourite_drink = row.get("favourite_beer", "").strip()
                if not favourite_drink:
                    raise UserLookupError("User does not have a favourite drink set.")
                return favourite_drink

    raise UserLookupError("User not found.")
