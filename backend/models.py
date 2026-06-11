import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


class UserRole(str, enum.Enum):
    marketing_professional = "marketing_professional"
    brand_owner = "brand_owner"


class CampaignRole(str, enum.Enum):
    member = "member"
    manager = "manager"
    approver = "approver"


class ApprovalStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class OutreachStatus(str, enum.Enum):
    draft = "draft"
    ready = "ready"
    sent = "sent"
    replied = "replied"
    negotiating = "negotiating"
    confirmed = "confirmed"
    declined = "declined"
    posted = "posted"
    completed = "completed"


class TemplateType(str, enum.Enum):
    intro = "intro"
    collaboration = "collaboration"
    budget = "budget"
    follow_up = "follow_up"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    full_name: Mapped[str] = mapped_column(String(255))
    role: Mapped[UserRole] = mapped_column(Enum(UserRole))
    brand_name: Mapped[str] = mapped_column(String(255), default="")
    job_title: Mapped[str] = mapped_column(String(255), default="")
    industry: Mapped[str] = mapped_column(String(255), default="")
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="owner")
    campaign_memberships: Mapped[list["CampaignMember"]] = relationship(back_populates="user")
    feedback: Mapped[list["CreatorFeedback"]] = relationship(back_populates="author")
    templates: Mapped[list["EmailTemplate"]] = relationship(back_populates="owner")
    oauth_accounts: Mapped[list["OAuthAccount"]] = relationship(back_populates="user")
    auth_events: Mapped[list["AuthEvent"]] = relationship(back_populates="user")


class EmailOtpCode(Base):
    __tablename__ = "email_otp_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    code_hash: Mapped[str] = mapped_column(String(255))
    purpose: Mapped[str] = mapped_column(String(50), default="register")
    expires_at: Mapped[datetime] = mapped_column(DateTime)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"
    __table_args__ = (UniqueConstraint("provider", "provider_user_id", name="uq_oauth_provider_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    provider: Mapped[str] = mapped_column(String(50))
    provider_user_id: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User"] = relationship(back_populates="oauth_accounts")


class AuthEvent(Base):
    __tablename__ = "auth_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    event: Mapped[str] = mapped_column(String(50))
    provider: Mapped[str] = mapped_column(String(50), default="email")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    user: Mapped["User | None"] = relationship(back_populates="auth_events")


class Creator(Base):
    __tablename__ = "creators"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    handle: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String(255))
    platform: Mapped[str] = mapped_column(String(50), default="instagram")
    profile_url: Mapped[str] = mapped_column(String(500), default="")
    profile_image_url: Mapped[str] = mapped_column(String(1000), default="")
    categories: Mapped[str] = mapped_column(String(500), default="")
    rank: Mapped[int] = mapped_column(Integer, default=0)
    followers: Mapped[float] = mapped_column(Float, default=0)
    audience_country: Mapped[str] = mapped_column(String(255), default="")
    authentic_engagement: Mapped[float] = mapped_column(Float, default=0)
    engagement_avg: Mapped[float] = mapped_column(Float, default=0)
    engagement_rate: Mapped[float] = mapped_column(Float, default=0)

    shortlist_items: Mapped[list["ShortlistItem"]] = relationship(back_populates="creator")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    title: Mapped[str] = mapped_column(String(255))
    brief_text: Mapped[str] = mapped_column(Text, default="")
    parsed_filters: Mapped[str] = mapped_column(Text, default="{}")
    status: Mapped[str] = mapped_column(String(50), default="active")
    budget: Mapped[str] = mapped_column(String(100), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User"] = relationship(back_populates="campaigns")
    members: Mapped[list["CampaignMember"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    shortlist: Mapped[list["ShortlistItem"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )
    posts: Mapped[list["CampaignPost"]] = relationship(
        back_populates="campaign", cascade="all, delete-orphan"
    )


class CampaignMember(Base):
    __tablename__ = "campaign_members"
    __table_args__ = (UniqueConstraint("campaign_id", "user_id", name="uq_campaign_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    role: Mapped[CampaignRole] = mapped_column(Enum(CampaignRole), default=CampaignRole.member)
    invited_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaign: Mapped["Campaign"] = relationship(back_populates="members")
    user: Mapped["User"] = relationship(back_populates="campaign_memberships")


class ShortlistItem(Base):
    __tablename__ = "shortlist_items"
    __table_args__ = (UniqueConstraint("campaign_id", "creator_id", name="uq_campaign_creator"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"))
    creator_id: Mapped[int] = mapped_column(ForeignKey("creators.id"))
    rank_score: Mapped[float] = mapped_column(Float, default=0)
    match_reasons: Mapped[str] = mapped_column(Text, default="[]")
    approval_status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.pending
    )
    approved_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outreach_status: Mapped[OutreachStatus] = mapped_column(
        Enum(OutreachStatus), default=OutreachStatus.draft
    )
    notes: Mapped[str] = mapped_column(Text, default="")
    added_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaign: Mapped["Campaign"] = relationship(back_populates="shortlist")
    creator: Mapped["Creator"] = relationship(back_populates="shortlist_items")
    feedback: Mapped[list["CreatorFeedback"]] = relationship(
        back_populates="shortlist_item", cascade="all, delete-orphan"
    )
    messages: Mapped[list["OutreachMessage"]] = relationship(
        back_populates="shortlist_item", cascade="all, delete-orphan"
    )


class CreatorFeedback(Base):
    __tablename__ = "creator_feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shortlist_item_id: Mapped[int] = mapped_column(ForeignKey("shortlist_items.id"))
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    comment: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    shortlist_item: Mapped["ShortlistItem"] = relationship(back_populates="feedback")
    author: Mapped["User"] = relationship(back_populates="feedback")


class OutreachMessage(Base):
    __tablename__ = "outreach_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    shortlist_item_id: Mapped[int] = mapped_column(ForeignKey("shortlist_items.id"))
    sender_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    subject: Mapped[str] = mapped_column(String(500), default="")
    body: Mapped[str] = mapped_column(Text, default="")
    template_id: Mapped[int | None] = mapped_column(ForeignKey("email_templates.id"), nullable=True)
    sent_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    shortlist_item: Mapped["ShortlistItem"] = relationship(back_populates="messages")


class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    owner_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    template_type: Mapped[TemplateType] = mapped_column(Enum(TemplateType))
    subject: Mapped[str] = mapped_column(String(500))
    body: Mapped[str] = mapped_column(Text)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    owner: Mapped["User | None"] = relationship(back_populates="templates")


class CampaignPost(Base):
    __tablename__ = "campaign_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"))
    creator_id: Mapped[int] = mapped_column(ForeignKey("creators.id"))
    platform: Mapped[str] = mapped_column(String(50), default="instagram")
    post_url: Mapped[str] = mapped_column(String(500), default="")
    likes: Mapped[int] = mapped_column(Integer, default=0)
    comments: Mapped[int] = mapped_column(Integer, default=0)
    views: Mapped[int] = mapped_column(Integer, default=0)
    posted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    campaign: Mapped["Campaign"] = relationship(back_populates="posts")


class InsightSnapshot(Base):
    __tablename__ = "insight_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    week_label: Mapped[str] = mapped_column(String(50))
    category: Mapped[str] = mapped_column(String(100))
    payload: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
