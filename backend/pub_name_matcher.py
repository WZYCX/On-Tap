import re
import unicodedata

APOSTROPHE_PATTERN = re.compile(r"[\'\u2018\u2019\u02bc\u0060]")
NON_ALNUM_PATTERN = re.compile(r"[^a-z0-9]+")


def normalize_pub_name(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize("NFKD", value)
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    normalized = APOSTROPHE_PATTERN.sub("", normalized.casefold())
    normalized = NON_ALNUM_PATTERN.sub(" ", normalized)
    return re.sub(r"\s+", " ", normalized).strip()


def build_pub_name_pattern(value: str | None) -> re.Pattern[str]:
    normalized = normalize_pub_name(value)
    if not normalized:
        return re.compile(r"^$")

    tokens = [re.escape(token) for token in normalized.split()]
    separator = r"[\s'`’‘\W_]*"
    return re.compile(rf"^{separator.join(tokens)}$", re.IGNORECASE)


def pub_names_match(left: str | None, right: str | None) -> bool:
    left_normalized = normalize_pub_name(left)
    right_normalized = normalize_pub_name(right)

    if not left_normalized or not right_normalized:
        return False

    if left_normalized == right_normalized:
        return True

    return bool(build_pub_name_pattern(left).match(right_normalized))
