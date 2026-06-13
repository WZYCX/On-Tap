import logging
import re
from typing import Any

from serper_helper import SearchProviderError, collect_drink_evidence, fetch_evidence_page

logger = logging.getLogger(__name__)


def _normalize_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"\s+", " ", value.lower()).strip()


def _build_drink_pattern(favourite_drink: str) -> re.Pattern[str]:
    escaped = re.escape(_normalize_text(favourite_drink))
    escaped = escaped.replace(r"\ ", r"\s+")
    return re.compile(rf"\b{escaped}\b", re.IGNORECASE)


def _extract_searchable_text(raw_html: str) -> str:
    without_scripts = re.sub(
        r"<script\b[^>]*>.*?</script>|<style\b[^>]*>.*?</style>",
        " ",
        raw_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    text_only = re.sub(r"<[^>]+>", " ", without_scripts)
    return _normalize_text(text_only)


def resolve_favourite_drink_match(
    pub_name: str,
    website_url: str | None,
    favourite_drink: str,
) -> dict[str, Any]:
    try:
        evidence = collect_drink_evidence(
            pub_name=pub_name,
            website_url=website_url,
            favourite_drink=favourite_drink,
        )
    except SearchProviderError as exc:
        logger.warning("Search provider lookup failed for pub=%s error=%s", pub_name, exc)
        return {
            "favourite_drink": favourite_drink,
            "contains_fav_beer": False,
            "favourite_drink_evidence_url": None,
            "favourite_drink_match_error": str(exc),
        }

    pattern = _build_drink_pattern(favourite_drink)

    for item in evidence:
        link = item.get("link")
        if not link:
            continue

        try:
            page = fetch_evidence_page(link)
        except SearchProviderError as exc:
            logger.warning("Evidence fetch failed pub=%s url=%s error=%s", pub_name, link, exc)
            continue

        searchable_text = _extract_searchable_text(str(page.get("html", "")))
        if pattern.search(searchable_text):
            logger.info(
                "Favourite drink HTML match found pub=%s drink=%s evidence_url=%s",
                pub_name,
                favourite_drink,
                link,
            )
            return {
                "favourite_drink": favourite_drink,
                "contains_fav_beer": True,
                "favourite_drink_evidence_url": link,
                "favourite_drink_match_error": None,
            }

    logger.info("No favourite drink HTML match found pub=%s drink=%s", pub_name, favourite_drink)
    return {
        "favourite_drink": favourite_drink,
        "contains_fav_beer": False,
        "favourite_drink_evidence_url": evidence[0].get("link") if evidence else None,
        "favourite_drink_match_error": None,
    }


def enrich_pub_with_favourite_drink(
    pub: dict[str, Any],
    favourite_drink: str,
) -> dict[str, Any]:
    enriched_pub = dict(pub)
    enriched_pub.update(
        resolve_favourite_drink_match(
            pub_name=str(pub.get("name", "")),
            website_url=pub.get("website_url"),
            favourite_drink=favourite_drink,
        )
    )
    return enriched_pub
