import logging
import os
from typing import Any
from urllib.parse import urlparse

import requests

SERPAPI_SEARCH_URL = "https://serpapi.com/search.json"
DEFAULT_FETCH_TIMEOUT_SECONDS = 10
MAX_EVIDENCE_RESULTS = 3
logger = logging.getLogger(__name__)


class SearchProviderError(RuntimeError):
    pass


def _get_serpapi_api_key() -> str:
    api_key = os.getenv("SERPAPI_API_KEY")
    if not api_key:
        raise SearchProviderError("SERPAPI_API_KEY is not set.")
    return api_key


def _extract_domain(url: str | None) -> str | None:
    if not url:
        return None

    hostname = urlparse(url).hostname
    if not hostname:
        return None

    return hostname.removeprefix("www.")


def _build_queries(pub_name: str, website_url: str | None, favourite_drink: str) -> list[str]:
    queries = [
        f'"{pub_name}" pub "{favourite_drink}"',
        f'"{pub_name}" bar "{favourite_drink}"',
        f'"{pub_name}" pub drinks menu "{favourite_drink}"',
    ]
    domain = _extract_domain(website_url)

    if domain:
        queries.insert(0, f'site:{domain} pub "{favourite_drink}"')
        queries.insert(1, f'site:{domain} bar "{favourite_drink}"')
        queries.append(f'site:{domain} "{pub_name}" pub drinks menu')

    deduped_queries: list[str] = []
    for query in queries:
        if query not in deduped_queries:
            deduped_queries.append(query)

    return deduped_queries[:4]


def collect_drink_evidence(
    pub_name: str,
    website_url: str | None,
    favourite_drink: str,
) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    seen_links: set[str] = set()

    for query in _build_queries(pub_name=pub_name, website_url=website_url, favourite_drink=favourite_drink):
        logger.info("Running SerpApi query pub=%s query=%s", pub_name, query)
        response = requests.get(
            SERPAPI_SEARCH_URL,
            params={
                "engine": "google",
                "q": query,
                "num": 5,
                "api_key": _get_serpapi_api_key(),
            },
            timeout=DEFAULT_FETCH_TIMEOUT_SECONDS,
        )

        try:
            response.raise_for_status()
        except requests.HTTPError as exc:
            logger.warning(
                "SerpApi search failed pub=%s query=%s status=%s body=%s",
                pub_name,
                query,
                response.status_code,
                response.text[:500],
            )
            raise SearchProviderError("SerpApi search request failed.") from exc

        payload = response.json()
        results = payload.get("organic_results", [])
        logger.info("SerpApi returned %s organic results for pub=%s", len(results), pub_name)
        for result in results:
            link = result.get("link")
            if not link or link in seen_links:
                continue
            seen_links.add(link)
            evidence.append(
                {
                    "query": query,
                    "title": result.get("title"),
                    "snippet": result.get("snippet"),
                    "link": link,
                }
            )
            if len(evidence) >= MAX_EVIDENCE_RESULTS:
                return evidence

    return evidence


def fetch_evidence_page(url: str) -> dict[str, Any]:
    logger.info("Fetching evidence page url=%s", url)
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (compatible; OnTapBot/1.0; "
                    "+https://example.com/ontap)"
                )
            },
            timeout=DEFAULT_FETCH_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        response = getattr(exc, "response", None)
        if response is not None:
            logger.warning(
                "Evidence page fetch failed url=%s status=%s body=%s",
                url,
                response.status_code,
                response.text[:500],
            )
        raise SearchProviderError(f"Evidence page fetch failed for {url}.") from exc

    return {
        "url": url,
        "html": response.text,
        "content_type": response.headers.get("Content-Type"),
    }
