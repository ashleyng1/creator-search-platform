import json
import sys
from pathlib import Path

import httpx
import pandas as pd
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from auth_utils import hash_password
from database import Base, SessionLocal, engine
from migrations import ensure_auth_schema
from services.profile_images import enrich_creator_photos
from models import (
    Campaign,
    CampaignMember,
    CampaignPost,
    CampaignRole,
    Creator,
    EmailTemplate,
    InsightSnapshot,
    ShortlistItem,
    TemplateType,
    User,
    UserRole,
)

CSV_URL = (
    "https://raw.githubusercontent.com/niteshkuwarbi/"
    "instagram-data-analysis/main/instagram_global_top_1000.csv"
)
DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


def download_csv() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    dest = DATA_DIR / "instagram_global_top_1000.csv"
    if dest.exists():
        return dest
    with httpx.Client(timeout=60) as client:
        resp = client.get(CSV_URL)
        resp.raise_for_status()
        dest.write_bytes(resp.content)
    return dest


def ensure_creator_schema() -> None:
    """Add new columns to existing SQLite DBs without a full migration."""
    with engine.connect() as conn:
        cols = {row[1] for row in conn.exec_driver_sql("PRAGMA table_info(creators)")}
        if "profile_image_url" not in cols:
            conn.exec_driver_sql(
                "ALTER TABLE creators ADD COLUMN profile_image_url VARCHAR(1000) DEFAULT ''"
            )
            conn.commit()


def load_creators(db: Session) -> int:
    if db.query(Creator).count() > 0:
        return db.query(Creator).count()

    csv_path = download_csv()
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    count = 0
    for _, row in df.iterrows():
        followers = float(row.get("Followers", 0) or 0)
        engagement_avg = float(row.get("Engagement avg", 0) or 0)
        er = engagement_avg / followers if followers > 0 else 0
        handle = str(row.get("Account", "")).strip()
        if not handle:
            continue
        creator = Creator(
            handle=handle,
            display_name=str(row.get("Title", handle)),
            platform="instagram",
            profile_url=str(row.get("Link", f"https://www.instagram.com/{handle}/")),
            profile_image_url="",
            categories=str(row.get("Category", "")),
            rank=int(row.get("Rank", 0) or 0),
            followers=followers,
            audience_country=str(row.get("Audience Country", "")),
            authentic_engagement=float(row.get("Authentic engagement", 0) or 0),
            engagement_avg=engagement_avg,
            engagement_rate=er,
        )
        db.add(creator)
        count += 1
    db.commit()
    return count


SYSTEM_TEMPLATES = [
    {
        "name": "Initial outreach",
        "template_type": TemplateType.intro,
        "subject": "Collaboration opportunity with {{brand_name}}",
        "body": (
            "Hi {{creator_name}},\n\n"
            "I'm {{sender_name}} from {{brand_name}}. We're launching {{campaign_title}} "
            "and your content on @{{creator_handle}} stood out to our team.\n\n"
            "We'd love to explore a collaboration. Would you be open to a quick call this week?\n\n"
            "Best regards,\n{{sender_name}}\n{{brand_name}}"
        ),
    },
    {
        "name": "Collaboration proposal",
        "template_type": TemplateType.collaboration,
        "subject": "Partnership proposal — {{campaign_title}}",
        "body": (
            "Hi {{creator_name}},\n\n"
            "Following up on our campaign {{campaign_title}} — we'd like to propose a partnership "
            "that includes:\n"
            "- 1 Instagram Reel showcasing the product\n"
            "- 2 Story frames with swipe-up / link in bio\n"
            "- Usage rights for 30 days\n\n"
            "Your audience in {{audience_country}} aligns well with our target market.\n\n"
            "Let me know if this interests you and we can share a full brief.\n\n"
            "Best,\n{{sender_name}}"
        ),
    },
    {
        "name": "Budget discussion",
        "template_type": TemplateType.budget,
        "subject": "Budget & deliverables — {{campaign_title}}",
        "body": (
            "Hi {{creator_name}},\n\n"
            "For {{campaign_title}}, our allocated budget for this collaboration is {{budget}}.\n\n"
            "Deliverables:\n"
            "- 1x Reel (60 sec max)\n"
            "- 2x Stories\n"
            "- Posting within agreed timeline\n\n"
            "Please share your rate card if this differs from your standard packages. "
            "We're flexible on format if the content fits our brand.\n\n"
            "Thanks,\n{{sender_name}}\n{{brand_name}}"
        ),
    },
    {
        "name": "Follow-up",
        "template_type": TemplateType.follow_up,
        "subject": "Following up — {{campaign_title}} collaboration",
        "body": (
            "Hi {{creator_name}},\n\n"
            "Just checking in on my previous message about {{campaign_title}} with {{brand_name}}.\n\n"
            "We'd still love to work with you if the timing works. Happy to adjust deliverables "
            "or timeline to fit your schedule.\n\n"
            "Looking forward to hearing from you.\n\n"
            "Best,\n{{sender_name}}"
        ),
    },
]


def seed_templates(db: Session) -> None:
    if db.query(EmailTemplate).filter(EmailTemplate.is_system == True).count() > 0:  # noqa: E712
        return
    for t in SYSTEM_TEMPLATES:
        db.add(
            EmailTemplate(
                owner_id=None,
                name=t["name"],
                template_type=t["template_type"],
                subject=t["subject"],
                body=t["body"],
                is_system=True,
            )
        )
    db.commit()


def seed_users(db: Session) -> User:
    demo = db.query(User).filter(User.email == "demo@brand.com").first()
    if demo:
        return demo

    owner = User(
        email="demo@brand.com",
        password_hash=hash_password("demo1234"),
        full_name="Sarah Al-Mansouri",
        role=UserRole.marketing_professional,
        brand_name="Glow Cosmetics GCC",
        job_title="Marketing Manager",
        industry="Beauty & Cosmetics",
        email_verified=True,
    )
    manager = User(
        email="manager@brand.com",
        password_hash=hash_password("demo1234"),
        full_name="Ahmed Hassan",
        role=UserRole.brand_owner,
        brand_name="Glow Cosmetics GCC",
        job_title="Brand Director",
        industry="Beauty & Cosmetics",
        email_verified=True,
    )
    member = User(
        email="member@brand.com",
        password_hash=hash_password("demo1234"),
        full_name="Layla Khan",
        role=UserRole.marketing_professional,
        brand_name="Glow Cosmetics GCC",
        job_title="Influencer Coordinator",
        industry="Beauty & Cosmetics",
        email_verified=True,
    )
    db.add_all([owner, manager, member])
    db.commit()
    db.refresh(owner)
    db.refresh(manager)
    db.refresh(member)
    return owner


def seed_demo_campaign(db: Session, owner: User) -> None:
    if db.query(Campaign).filter(Campaign.owner_id == owner.id).count() > 0:
        return

    brief = (
        "Launch gloss lipstick for GCC female audience, makeup lovers, age 30-35, "
        "micro to mid-tier beauty influencers"
    )
    from services.nl_parser import parse_brief

    filters = parse_brief(brief)
    campaign = Campaign(
        owner_id=owner.id,
        title="Gloss Lipstick GCC Launch",
        brief_text=brief,
        parsed_filters=json.dumps(filters),
        budget="$3,000 - $8,000 per creator",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    manager = db.query(User).filter(User.email == "manager@brand.com").first()
    member = db.query(User).filter(User.email == "member@brand.com").first()
    if manager:
        db.add(
            CampaignMember(
                campaign_id=campaign.id, user_id=manager.id, role=CampaignRole.approver
            )
        )
    if member:
        db.add(
            CampaignMember(campaign_id=campaign.id, user_id=member.id, role=CampaignRole.member)
        )

    from services.recommender import recommend_creators

    results = recommend_creators(db, filters, limit=5)
    for r in results:
        db.add(
            ShortlistItem(
                campaign_id=campaign.id,
                creator_id=r["id"],
                rank_score=r["score"],
                match_reasons=json.dumps(r["match_reasons"]),
            )
        )
    db.commit()


def seed_insights(db: Session) -> None:
    if db.query(InsightSnapshot).count() > 0:
        return

    creators = db.query(Creator).all()
    beauty = [c for c in creators if "beauty" in c.categories.lower()]
    fashion = [c for c in creators if "fashion" in c.categories.lower()]

    def avg_er(group):
        if not group:
            return 0
        return sum(c.engagement_rate for c in group) / len(group)

    snapshots = [
        {
            "week_label": "This week",
            "category": "Beauty",
            "payload": {
                "avg_engagement_rate": round(avg_er(beauty) * 100, 3),
                "creator_count": len(beauty),
                "top_handles": sorted(beauty, key=lambda c: c.engagement_rate, reverse=True)[:5],
                "insight": "Beauty creators averaging {:.2f}% ER — Reels outperform static posts 2.1x".format(
                    avg_er(beauty) * 100
                ),
            },
        },
        {
            "week_label": "This week",
            "category": "Fashion",
            "payload": {
                "avg_engagement_rate": round(avg_er(fashion) * 100, 3),
                "creator_count": len(fashion),
                "top_handles": sorted(fashion, key=lambda c: c.engagement_rate, reverse=True)[:5],
                "insight": "Fashion category shows strong US audience concentration",
            },
        },
    ]
    for s in snapshots:
        top = s["payload"]["top_handles"]
        s["payload"]["top_handles"] = [
            {"handle": c.handle, "followers": c.followers, "er": round(c.engagement_rate * 100, 3)}
            for c in top
        ]
        db.add(
            InsightSnapshot(
                week_label=s["week_label"],
                category=s["category"],
                payload=json.dumps(s["payload"]),
            )
        )
    db.commit()


def seed_all() -> None:
    Base.metadata.create_all(bind=engine)
    ensure_creator_schema()
    ensure_auth_schema()
    db = SessionLocal()
    try:
        n = load_creators(db)
        print(f"Loaded {n} creators from Instagram Top 1000 CSV")
        added = enrich_creator_photos(db, max_count=40)
        if added:
            print(f"Enriched {added} creator profile photos")
        seed_templates(db)
        owner = seed_users(db)
        seed_demo_campaign(db, owner)
        seed_insights(db)
        print("Seed complete. Login: demo@brand.com / demo1234")
    finally:
        db.close()


if __name__ == "__main__":
    seed_all()
