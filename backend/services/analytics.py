from sqlalchemy.orm import Session

from models import CampaignPost, Creator


def compute_campaign_analytics(db: Session, campaign_id: int) -> dict:
    posts = db.query(CampaignPost).filter(CampaignPost.campaign_id == campaign_id).all()
    if not posts:
        return {"posts": [], "summary": {}}

    results = []
    engagement_rates = []
    for post in posts:
        creator = db.query(Creator).filter(Creator.id == post.creator_id).first()
        followers = creator.followers if creator else 1
        er = ((post.likes + post.comments) / max(followers, 1)) * 100
        baseline_er = (creator.engagement_rate or 0) * 100 if creator else er
        er_vs_baseline = er / baseline_er if baseline_er > 0 else 1.0
        reach_eff = post.views / max(followers, 1) if post.views else 0
        engagement_rates.append(er)
        results.append(
            {
                "post_id": post.id,
                "creator_id": post.creator_id,
                "creator_handle": creator.handle if creator else "",
                "creator_name": creator.display_name if creator else "",
                "followers": followers,
                "likes": post.likes,
                "comments": post.comments,
                "views": post.views,
                "engagement_rate": round(er, 4),
                "er_vs_baseline": round(er_vs_baseline, 3),
                "reach_efficiency": round(reach_eff, 6),
                "post_url": post.post_url,
                "posted_at": post.posted_at.isoformat(),
            }
        )

    if len(engagement_rates) > 1:
        mean_er = sum(engagement_rates) / len(engagement_rates)
        std_er = (sum((x - mean_er) ** 2 for x in engagement_rates) / len(engagement_rates)) ** 0.5
        for r in results:
            z = (r["engagement_rate"] - mean_er) / std_er if std_er > 0 else 0
            r["index_score"] = round(z, 3)
    else:
        for r in results:
            r["index_score"] = 0.0

    results.sort(key=lambda x: x["index_score"], reverse=True)
    return {
        "posts": results,
        "summary": {
            "count": len(results),
            "avg_engagement_rate": round(sum(engagement_rates) / len(engagement_rates), 4)
            if engagement_rates
            else 0,
            "top_performer": results[0]["creator_handle"] if results else None,
        },
    }
