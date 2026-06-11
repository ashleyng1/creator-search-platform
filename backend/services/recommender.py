import json
import math
from typing import Any

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import MinMaxScaler
from sqlalchemy.orm import Session

from models import Creator


def _niche_score(categories: str, niches: list[str]) -> float:
    cats = categories.lower()
    if not niches:
        return 0.5
    hits = sum(1 for n in niches if n in cats)
    return min(hits / len(niches), 1.0)


def _region_score(audience_country: str, audience_countries: list[str], regions: list[str]) -> float:
    ac = audience_country.lower()
    gcc_map = {
        "united arab emirates": "AE",
        "saudi arabia": "SA",
        "qatar": "QA",
        "kuwait": "KW",
        "bahrain": "BH",
        "oman": "OM",
    }
    if audience_countries:
        for country in audience_countries:
            if country.lower() in ac:
                return 1.0
    if regions:
        for country, code in gcc_map.items():
            if code in regions and country in ac:
                return 1.0
    return 0.3


def _follower_tier_score(followers: float, fmin: float | None, fmax: float | None) -> float:
    if fmin is None and fmax is None:
        return 0.7
    lo = fmin or 0
    hi = fmax or float("inf")
    if lo <= followers <= hi:
        return 1.0
    if followers < lo:
        return max(0.2, followers / lo)
    return max(0.2, hi / followers)


def recommend_creators(
    db: Session, filters: dict[str, Any], limit: int = 20
) -> list[dict[str, Any]]:
    query = db.query(Creator)
    creators = query.all()
    if not creators:
        return []

    rows = []
    for c in creators:
        if filters.get("follower_min") and c.followers < filters["follower_min"]:
            continue
        if filters.get("follower_max") and c.followers > filters["follower_max"]:
            continue
        niche_s = _niche_score(c.categories, filters.get("niches", []))
        region_s = _region_score(
            c.audience_country,
            filters.get("audience_countries", []),
            filters.get("regions", []),
        )
        tier_s = _follower_tier_score(
            c.followers, filters.get("follower_min"), filters.get("follower_max")
        )
        er = c.engagement_rate or 0
        score = 0.35 * min(er * 100, 1.0) + 0.30 * niche_s + 0.20 * region_s + 0.15 * tier_s
        reasons = []
        if niche_s >= 0.5:
            reasons.append("Strong niche match")
        if region_s >= 0.8:
            reasons.append("Target audience geography")
        if er > 0.01:
            reasons.append("Above-average engagement rate")
        if tier_s >= 0.9:
            reasons.append("Follower tier fits brief")
        rows.append(
            {
                "creator": c,
                "score": score,
                "reasons": reasons or ["General fit"],
                "niche_s": niche_s,
                "region_s": region_s,
                "er": er,
            }
        )

    if len(rows) < 5:
        for c in creators:
            if not any(r["creator"].id == c.id for r in rows):
                rows.append(
                    {
                        "creator": c,
                        "score": 0.3,
                        "reasons": ["Broad match"],
                        "niche_s": 0.3,
                        "region_s": 0.3,
                        "er": c.engagement_rate or 0,
                    }
                )

    df = pd.DataFrame(
        [
            {
                "idx": i,
                "log_followers": math.log10(max(r["creator"].followers, 1)),
                "er": r["er"],
                "niche_s": r["niche_s"],
                "region_s": r["region_s"],
            }
            for i, r in enumerate(rows)
        ]
    )

    if len(df) >= 5:
        scaler = MinMaxScaler()
        features = scaler.fit_transform(df[["log_followers", "er", "niche_s", "region_s"]])
        k = min(5, len(df))
        kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = kmeans.fit_predict(features)
        df["cluster"] = labels
        brief_vec = np.array(
            [
                filters.get("follower_min", 100000) or 100000,
                0.02,
                1.0 if filters.get("niches") else 0.5,
                1.0 if filters.get("regions") else 0.3,
            ],
            dtype=float,
        )
        brief_vec[0] = math.log10(max(brief_vec[0], 1))
        brief_scaled = scaler.transform([brief_vec[:4]])[0]
        centroids = kmeans.cluster_centers_
        dists = np.linalg.norm(centroids - brief_scaled, axis=1)
        best_cluster = int(np.argmin(dists))
        for i, r in enumerate(rows):
            r["cluster"] = int(labels[i])
            if r["cluster"] == best_cluster:
                r["score"] += 0.1
                r["reasons"].append("Best-fit cluster")

    rows.sort(key=lambda x: x["score"], reverse=True)
    results = []
    for r in rows[:limit]:
        c = r["creator"]
        results.append(
            {
                "id": c.id,
                "handle": c.handle,
                "display_name": c.display_name,
                "platform": c.platform,
                "profile_url": c.profile_url,
                "profile_image_url": c.profile_image_url or "",
                "categories": c.categories,
                "followers": c.followers,
                "audience_country": c.audience_country,
                "engagement_rate": c.engagement_rate,
                "engagement_avg": c.engagement_avg,
                "rank": c.rank,
                "score": round(r["score"], 3),
                "cluster": r.get("cluster", 0),
                "match_reasons": r["reasons"],
            }
        )
    return results
