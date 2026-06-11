import json
import re
from typing import Any


GCC_COUNTRIES = {
    "united arab emirates": "AE",
    "uae": "AE",
    "dubai": "AE",
    "abu dhabi": "AE",
    "saudi arabia": "SA",
    "ksa": "SA",
    "qatar": "QA",
    "kuwait": "KW",
    "bahrain": "BH",
    "oman": "OM",
    "gcc": "GCC",
    "gulf": "GCC",
    "middle east": "GCC",
}

NICHE_KEYWORDS = {
    "beauty": ["beauty", "makeup", "cosmetic", "lipstick", "gloss", "skincare", "mua"],
    "fashion": ["fashion", "style", "outfit", "modeling", "model"],
    "fitness": ["fitness", "gym", "workout", "health"],
    "food": ["food", "recipe", "cooking", "restaurant"],
    "lifestyle": ["lifestyle", "daily", "vlog"],
    "music": ["music", "singer", "artist"],
    "sports": ["sport", "football", "soccer", "basketball"],
}

TIER_THRESHOLDS = {
    "nano": (1000, 10000),
    "micro": (10000, 100000),
    "mid": (100000, 500000),
    "macro": (500000, 5000000),
    "mega": (5000000, 999999999),
}


def parse_brief(text: str) -> dict[str, Any]:
    lower = text.lower()
    filters: dict[str, Any] = {
        "niches": [],
        "regions": [],
        "audience_countries": [],
        "categories": [],
        "follower_min": None,
        "follower_max": None,
        "platforms": ["instagram"],
        "keywords": [],
    }

    for niche, keywords in NICHE_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            filters["niches"].append(niche)

    for region_name, code in GCC_COUNTRIES.items():
        if region_name in lower:
            if code == "GCC":
                filters["regions"].extend(["AE", "SA", "QA", "KW", "BH", "OM"])
            elif code not in filters["regions"]:
                filters["regions"].append(code)
            if region_name not in ("gcc", "gulf", "middle east"):
                country_label = region_name.title()
                if country_label not in filters["audience_countries"]:
                    filters["audience_countries"].append(country_label)

    age_match = re.search(r"(\d{2})\s*[-–to]+\s*(\d{2})", lower)
    if age_match:
        filters["audience_age_min"] = int(age_match.group(1))
        filters["audience_age_max"] = int(age_match.group(2))
    elif "30s" in lower:
        filters["audience_age_min"] = 30
        filters["audience_age_max"] = 39

    if any(w in lower for w in ["female", "women", "woman", "ladies"]):
        filters["audience_gender"] = "female"
    elif any(w in lower for w in ["male", "men", "man"]):
        filters["audience_gender"] = "male"

    for tier, (lo, hi) in TIER_THRESHOLDS.items():
        if tier in lower:
            filters["follower_min"] = lo
            filters["follower_max"] = hi
            break

    if "micro" in lower and filters["follower_min"] is None:
        filters["follower_min"] = 10000
        filters["follower_max"] = 100000
    if "mid" in lower and filters["follower_min"] is None:
        filters["follower_min"] = 100000
        filters["follower_max"] = 500000

    if not filters["niches"]:
        filters["niches"] = ["beauty", "fashion", "lifestyle"]

    filters["keywords"] = list(set(re.findall(r"[a-z]{4,}", lower)))
    return filters
