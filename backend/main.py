import json
import re
from datetime import datetime

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth_utils import (
    can_approve,
    create_access_token,
    get_current_user,
    hash_password,
    require_campaign_access,
    verify_password,
)
from database import Base, engine, get_db
from models import (
    ApprovalStatus,
    Campaign,
    CampaignMember,
    CampaignPost,
    CampaignRole,
    Creator,
    CreatorFeedback,
    EmailTemplate,
    InsightSnapshot,
    OutreachMessage,
    OutreachStatus,
    ShortlistItem,
    TemplateType,
    User,
    UserRole,
)
from schemas import (
    ApprovalAction,
    CampaignCreate,
    CampaignOut,
    CreatorOut,
    EmailTemplateCreate,
    EmailTemplateOut,
    EmailTemplateUpdate,
    FeedbackCreate,
    FeedbackOut,
    OutreachMessageCreate,
    ParseBriefRequest,
    PostCreate,
    SearchRequest,
    ShortlistAdd,
    ShortlistItemOut,
    TeamMemberAdd,
    TeamMemberOut,
    TemplatePreviewRequest,
    TokenOut,
    UserOut,
    UserRegister,
)
from services.analytics import compute_campaign_analytics
from services.nl_parser import parse_brief
from services.recommender import recommend_creators

app = FastAPI(title="Creator Search Platform API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_origin_regex=(
        r"https://.*\.trycloudflare\.com|"
        r"https://.*\.ngrok-free\.app|"
        r"https://.*\.ngrok\.io|"
        r"https://.*\.ngrok-free\.dev|"
        r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}):3000"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def render_template(text: str, variables: dict) -> str:
    result = text
    for key, value in variables.items():
        result = result.replace("{{" + key + "}}", str(value))
    return result


@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    try:
        from scripts.seed_db import seed_all

        seed_all()
    except Exception as exc:
        print(f"Seed skipped or partial: {exc}")


@app.post("/api/auth/register", response_model=TokenOut)
def register(data: UserRegister, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole(data.role),
        brand_name=data.brand_name,
        job_title=data.job_title,
        industry=data.industry,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.post("/api/auth/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


@app.get("/api/auth/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@app.post("/api/search/parse")
def search_parse(data: ParseBriefRequest):
    return {"filters": parse_brief(data.brief), "brief": data.brief}


@app.post("/api/search/creators")
def search_creators(data: SearchRequest, db: Session = Depends(get_db)):
    filters = data.filters or parse_brief(data.brief)
    results = recommend_creators(db, filters, limit=data.limit)
    return {"filters": filters, "results": results}


@app.get("/api/creators")
def list_creators(
    q: str = "",
    category: str = "",
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    query = db.query(Creator)
    if q:
        query = query.filter(
            Creator.handle.ilike(f"%{q}%") | Creator.display_name.ilike(f"%{q}%")
        )
    if category:
        query = query.filter(Creator.categories.ilike(f"%{category}%"))
    total = query.count()
    items = query.order_by(Creator.rank).offset(skip).limit(limit).all()
    return {
        "total": total,
        "items": [CreatorOut.model_validate(c) for c in items],
    }


@app.get("/api/creators/{creator_id}", response_model=CreatorOut)
def get_creator(creator_id: int, db: Session = Depends(get_db)):
    creator = db.query(Creator).filter(Creator.id == creator_id).first()
    if not creator:
        raise HTTPException(status_code=404, detail="Creator not found")
    return CreatorOut.model_validate(creator)


@app.post("/api/campaigns", response_model=CampaignOut)
def create_campaign(
    data: CampaignCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filters = data.parsed_filters or parse_brief(data.brief_text)
    campaign = Campaign(
        owner_id=user.id,
        title=data.title,
        brief_text=data.brief_text,
        parsed_filters=json.dumps(filters),
        budget=data.budget,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return CampaignOut(
        id=campaign.id,
        title=campaign.title,
        brief_text=campaign.brief_text,
        parsed_filters=filters,
        status=campaign.status,
        budget=campaign.budget,
        created_at=campaign.created_at,
        owner_id=campaign.owner_id,
    )


@app.get("/api/campaigns")
def list_campaigns(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    owned = db.query(Campaign).filter(Campaign.owner_id == user.id).all()
    member_ids = [
        m.campaign_id
        for m in db.query(CampaignMember).filter(CampaignMember.user_id == user.id).all()
    ]
    member_campaigns = db.query(Campaign).filter(Campaign.id.in_(member_ids)).all() if member_ids else []
    all_campaigns = {c.id: c for c in owned + member_campaigns}
    result = []
    for c in all_campaigns.values():
        result.append(
            CampaignOut(
                id=c.id,
                title=c.title,
                brief_text=c.brief_text,
                parsed_filters=json.loads(c.parsed_filters or "{}"),
                status=c.status,
                budget=c.budget,
                created_at=c.created_at,
                owner_id=c.owner_id,
            )
        )
    return result


@app.get("/api/campaigns/{campaign_id}", response_model=CampaignOut)
def get_campaign(
    campaign_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    c = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    return CampaignOut(
        id=c.id,
        title=c.title,
        brief_text=c.brief_text,
        parsed_filters=json.loads(c.parsed_filters or "{}"),
        status=c.status,
        budget=c.budget,
        created_at=c.created_at,
        owner_id=c.owner_id,
    )


@app.get("/api/campaigns/{campaign_id}/shortlist")
def get_shortlist(
    campaign_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    items = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.campaign_id == campaign_id)
        .order_by(ShortlistItem.rank_score.desc())
        .all()
    )
    out = []
    for item in items:
        out.append(
            ShortlistItemOut(
                id=item.id,
                creator=CreatorOut.model_validate(item.creator),
                rank_score=item.rank_score,
                match_reasons=json.loads(item.match_reasons or "[]"),
                approval_status=item.approval_status.value,
                outreach_status=item.outreach_status.value,
                notes=item.notes,
                approved_at=item.approved_at,
                feedback_count=len(item.feedback),
            )
        )
    return out


@app.post("/api/campaigns/{campaign_id}/shortlist")
def add_shortlist(
    campaign_id: int,
    data: ShortlistAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    existing = (
        db.query(ShortlistItem)
        .filter(
            ShortlistItem.campaign_id == campaign_id,
            ShortlistItem.creator_id == data.creator_id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Creator already shortlisted")
    item = ShortlistItem(
        campaign_id=campaign_id,
        creator_id=data.creator_id,
        rank_score=data.rank_score,
        match_reasons=json.dumps(data.match_reasons),
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {"id": item.id}


@app.delete("/api/campaigns/{campaign_id}/shortlist/{item_id}")
def remove_shortlist(
    campaign_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    db.delete(item)
    db.commit()
    return {"ok": True}


@app.post("/api/campaigns/{campaign_id}/shortlist/{item_id}/feedback", response_model=FeedbackOut)
def add_feedback(
    campaign_id: int,
    item_id: int,
    data: FeedbackCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    fb = CreatorFeedback(
        shortlist_item_id=item.id,
        author_id=user.id,
        rating=data.rating,
        comment=data.comment,
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return FeedbackOut(
        id=fb.id,
        author_id=user.id,
        author_name=user.full_name,
        rating=fb.rating,
        comment=fb.comment,
        created_at=fb.created_at,
    )


@app.get("/api/campaigns/{campaign_id}/shortlist/{item_id}/feedback")
def list_feedback(
    campaign_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    return [
        FeedbackOut(
            id=fb.id,
            author_id=fb.author_id,
            author_name=fb.author.full_name,
            rating=fb.rating,
            comment=fb.comment,
            created_at=fb.created_at,
        )
        for fb in item.feedback
    ]


@app.post("/api/campaigns/{campaign_id}/shortlist/{item_id}/approve")
def approve_creator(
    campaign_id: int,
    item_id: int,
    data: ApprovalAction,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = require_campaign_access(db, campaign_id, user, min_role=CampaignRole.approver)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not can_approve(user, member, campaign.owner_id):
        raise HTTPException(status_code=403, detail="Only managers/approvers can approve outreach")

    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")

    if data.status == "approved":
        item.approval_status = ApprovalStatus.approved
        item.approved_by_id = user.id
        item.approved_at = datetime.utcnow()
        item.outreach_status = OutreachStatus.ready
    elif data.status == "rejected":
        item.approval_status = ApprovalStatus.rejected
        item.approved_by_id = user.id
        item.approved_at = datetime.utcnow()
        item.outreach_status = OutreachStatus.draft
    else:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    db.commit()
    return {"approval_status": item.approval_status.value, "outreach_status": item.outreach_status.value}


@app.get("/api/campaigns/{campaign_id}/team")
def list_team(
    campaign_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    owner = db.query(User).filter(User.id == campaign.owner_id).first()
    members = db.query(CampaignMember).filter(CampaignMember.campaign_id == campaign_id).all()
    result = [
        TeamMemberOut(
            id=0,
            user_id=owner.id,
            email=owner.email,
            full_name=owner.full_name,
            role="owner",
            invited_at=campaign.created_at,
        )
    ]
    for m in members:
        result.append(
            TeamMemberOut(
                id=m.id,
                user_id=m.user_id,
                email=m.user.email,
                full_name=m.user.full_name,
                role=m.role.value,
                invited_at=m.invited_at,
            )
        )
    return result


@app.post("/api/campaigns/{campaign_id}/team")
def add_team_member(
    campaign_id: int,
    data: TeamMemberAdd,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user, min_role=CampaignRole.manager)
    target = db.query(User).filter(User.email == data.email).first()
    if not target:
        raise HTTPException(
            status_code=404,
            detail="User not found. They must register first.",
        )
    existing = (
        db.query(CampaignMember)
        .filter(CampaignMember.campaign_id == campaign_id, CampaignMember.user_id == target.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Already on team")
    member = CampaignMember(
        campaign_id=campaign_id,
        user_id=target.id,
        role=CampaignRole(data.role),
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return TeamMemberOut(
        id=member.id,
        user_id=target.id,
        email=target.email,
        full_name=target.full_name,
        role=member.role.value,
        invited_at=member.invited_at,
    )


@app.get("/api/templates", response_model=list[EmailTemplateOut])
def list_templates(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    system = db.query(EmailTemplate).filter(EmailTemplate.is_system == True).all()  # noqa: E712
    custom = db.query(EmailTemplate).filter(EmailTemplate.owner_id == user.id).all()
    return [EmailTemplateOut.model_validate(t) for t in system + custom]


@app.post("/api/templates", response_model=EmailTemplateOut)
def create_template(
    data: EmailTemplateCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = EmailTemplate(
        owner_id=user.id,
        name=data.name,
        template_type=TemplateType(data.template_type),
        subject=data.subject,
        body=data.body,
        is_system=False,
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return EmailTemplateOut.model_validate(t)


@app.put("/api/templates/{template_id}", response_model=EmailTemplateOut)
def update_template(
    template_id: int,
    data: EmailTemplateUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    if t.is_system and t.owner_id is None:
        copy = EmailTemplate(
            owner_id=user.id,
            name=data.name or t.name + " (custom)",
            template_type=t.template_type,
            subject=data.subject or t.subject,
            body=data.body or t.body,
            is_system=False,
        )
        db.add(copy)
        db.commit()
        db.refresh(copy)
        return EmailTemplateOut.model_validate(copy)
    if t.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not your template")
    if data.name:
        t.name = data.name
    if data.subject:
        t.subject = data.subject
    if data.body:
        t.body = data.body
    t.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(t)
    return EmailTemplateOut.model_validate(t)


@app.post("/api/templates/preview")
def preview_template(
    data: TemplatePreviewRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    t = db.query(EmailTemplate).filter(EmailTemplate.id == data.template_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Template not found")
    variables = {
        "creator_name": data.creator_name or "Creator",
        "creator_handle": data.creator_handle or "creator",
        "campaign_title": data.campaign_title or "Campaign",
        "brand_name": data.brand_name or user.brand_name,
        "budget": data.budget or "TBD",
        "sender_name": user.full_name,
        "audience_country": "GCC",
    }
    return {
        "subject": render_template(t.subject, variables),
        "body": render_template(t.body, variables),
    }


@app.post("/api/campaigns/{campaign_id}/shortlist/{item_id}/outreach")
def send_outreach(
    campaign_id: int,
    item_id: int,
    data: OutreachMessageCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    if item.approval_status != ApprovalStatus.approved:
        raise HTTPException(
            status_code=403,
            detail="Creator must be approved by a manager before outreach",
        )
    msg = OutreachMessage(
        shortlist_item_id=item.id,
        sender_id=user.id,
        subject=data.subject,
        body=data.body,
        template_id=data.template_id,
    )
    item.outreach_status = OutreachStatus.sent
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return {"id": msg.id, "outreach_status": item.outreach_status.value}


@app.get("/api/campaigns/{campaign_id}/shortlist/{item_id}/outreach")
def get_outreach(
    campaign_id: int,
    item_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    item = (
        db.query(ShortlistItem)
        .filter(ShortlistItem.id == item_id, ShortlistItem.campaign_id == campaign_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Shortlist item not found")
    return [
        {
            "id": m.id,
            "subject": m.subject,
            "body": m.body,
            "sender_id": m.sender_id,
            "sent_at": m.sent_at.isoformat(),
            "template_id": m.template_id,
        }
        for m in item.messages
    ]


@app.post("/api/campaigns/{campaign_id}/posts")
def add_post(
    campaign_id: int,
    data: PostCreate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    post = CampaignPost(
        campaign_id=campaign_id,
        creator_id=data.creator_id,
        platform=data.platform,
        post_url=data.post_url,
        likes=data.likes,
        comments=data.comments,
        views=data.views,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"id": post.id}


@app.get("/api/campaigns/{campaign_id}/analytics")
def campaign_analytics(
    campaign_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_campaign_access(db, campaign_id, user)
    return compute_campaign_analytics(db, campaign_id)


@app.get("/api/insights/weekly")
def weekly_insights(db: Session = Depends(get_db)):
    snapshots = db.query(InsightSnapshot).order_by(InsightSnapshot.category).all()
    return [
        {
            "week_label": s.week_label,
            "category": s.category,
            "payload": json.loads(s.payload),
        }
        for s in snapshots
    ]


@app.get("/api/health")
def health():
    return {"status": "ok"}
