import random


def _seed_from_pub_name(pub_name: str | None) -> int:
    normalized_name = (pub_name or "Unknown pub").strip() or "Unknown pub"
    return int(normalized_name.encode("utf-8").hex(), 16)


def build_pub_rating(pub_name: str | None) -> tuple[float, int]:
    seeded_random = random.Random(_seed_from_pub_name(pub_name))
    rating_tenths = seeded_random.randint(36, 49)
    user_rating_count = seeded_random.randint(24, 640)
    return rating_tenths / 10, user_rating_count
