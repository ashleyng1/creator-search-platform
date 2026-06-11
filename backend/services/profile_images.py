import json
import re
import time
from pathlib import Path
from typing import Any

import httpx

WIKI_API = "https://en.wikipedia.org/w/api.php"
WIKI_HEADERS = {"User-Agent": "Creator/1.0 (influencer discovery demo; local dev)"}
WIKI_TITLES_PATH = Path(__file__).resolve().parent.parent / "data" / "creator_wiki_titles.json"
BATCH_SIZE = 20


def _load_wiki_titles() -> dict[str, str]:
    if not WIKI_TITLES_PATH.exists():
        return {}
    return json.loads(WIKI_TITLES_PATH.read_text(encoding="utf-8"))


def _clean_display_name(name: str) -> str:
    cleaned = re.sub(r"[^\w\s\-'.]", " ", name)
    return re.sub(r"\s+", " ", cleaned).strip()


def _wiki_get(client: httpx.Client, params: dict[str, Any], retries: int = 4) -> httpx.Response:
    for attempt in range(retries):
        resp = client.get(WIKI_API, params=params, headers=WIKI_HEADERS, timeout=20)
        if resp.status_code != 429:
            resp.raise_for_status()
            return resp
        time.sleep(2 * (attempt + 1))
    resp.raise_for_status()
    return resp


def _wiki_search_title(client: httpx.Client, query: str) -> str | None:
    if not query:
        return None
    try:
        resp = _wiki_get(
            client,
            {
                "action": "query",
                "list": "search",
                "srsearch": query,
                "format": "json",
                "srlimit": 1,
            },
        )
    except httpx.HTTPStatusError:
        return None
    hits: list[dict[str, Any]] = resp.json().get("query", {}).get("search", [])
    if not hits:
        return None
    return hits[0].get("title")


def _wiki_thumbnails_batch(client: httpx.Client, titles: list[str]) -> dict[str, str]:
    if not titles:
        return {}
    try:
        resp = _wiki_get(
            client,
            {
                "action": "query",
                "titles": "|".join(titles),
                "prop": "pageimages",
                "format": "json",
                "pithumbsize": 256,
            },
        )
    except httpx.HTTPStatusError:
        return {}

    out: dict[str, str] = {}
    for page in resp.json().get("query", {}).get("pages", {}).values():
        if page.get("pageid", -1) < 0:
            continue
        title = page.get("title")
        thumb = page.get("thumbnail", {}).get("source")
        if title and thumb:
            out[title] = thumb
    return out


def fetch_profile_image_url(handle: str, display_name: str, client: httpx.Client | None = None) -> str:
    """Resolve a public profile photo URL, preferring Wikipedia thumbnails."""
    own_client = client is None
    if own_client:
        client = httpx.Client()

    try:
        wiki_titles = _load_wiki_titles()
        if handle in wiki_titles:
            thumbs = _wiki_thumbnails_batch(client, [wiki_titles[handle]])
            if thumbs:
                return next(iter(thumbs.values()))

        queries = []
        cleaned = _clean_display_name(display_name)
        if cleaned:
            queries.append(cleaned)
        if handle:
            queries.append(handle.replace("_", " "))

        for query in queries:
            title = _wiki_search_title(client, query)
            if not title:
                continue
            thumbs = _wiki_thumbnails_batch(client, [title])
            if thumbs:
                return next(iter(thumbs.values()))
        return ""
    finally:
        if own_client:
            client.close()


def enrich_creator_photos(
    db: Any,
    *,
    max_count: int = 100,
    delay_seconds: float = 0.5,
) -> int:
    """Backfill profile_image_url for creators missing a photo."""
    from models import Creator

    wiki_titles = _load_wiki_titles()
    pending = (
        db.query(Creator)
        .filter((Creator.profile_image_url == "") | (Creator.profile_image_url.is_(None)))
        .order_by(Creator.rank.asc())
        .limit(max_count)
        .all()
    )
    if not pending:
        return 0

    updated = 0
    with httpx.Client() as client:
        mapped: list[tuple[Any, str]] = []
        unmapped: list[Any] = []
        for creator in pending:
            title = wiki_titles.get(creator.handle)
            if title:
                mapped.append((creator, title))
            else:
                unmapped.append(creator)

        unique_titles = list(dict.fromkeys(title for _, title in mapped))
        title_to_url: dict[str, str] = {}
        for i in range(0, len(unique_titles), BATCH_SIZE):
            batch = unique_titles[i : i + BATCH_SIZE]
            title_to_url.update(_wiki_thumbnails_batch(client, batch))
            if delay_seconds:
                time.sleep(delay_seconds)

        for creator, title in mapped:
            url = title_to_url.get(title, "")
            if url:
                creator.profile_image_url = url
                updated += 1

        # Skip slow per-creator search during startup; mapped handles cover top accounts.

    if updated:
        db.commit()
    return updated
