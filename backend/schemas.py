from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str
    role: str = "marketing_professional"
    brand_name: str = ""
    job_title: str = ""
    industry: str = ""


class OtpRequest(BaseModel):
    email: EmailStr


class OtpVerifyRegister(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
    password: str = Field(min_length=6)
    full_name: str
    role: str = "marketing_professional"
    brand_name: str = ""
    job_title: str = ""
    industry: str = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    brand_name: str
    job_title: str
    industry: str

    model_config = {"from_attributes": True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ParseBriefRequest(BaseModel):
    brief: str


class SearchRequest(BaseModel):
    brief: str = ""
    filters: dict[str, Any] | None = None
    limit: int = 20


class CreatorOut(BaseModel):
    id: int
    handle: str
    display_name: str
    platform: str
    profile_url: str
    profile_image_url: str = ""
    categories: str
    followers: float
    audience_country: str
    engagement_rate: float
    engagement_avg: float
    rank: int
    score: float | None = None
    cluster: int | None = None
    match_reasons: list[str] | None = None

    model_config = {"from_attributes": True}


class CampaignCreate(BaseModel):
    title: str
    brief_text: str = ""
    parsed_filters: dict[str, Any] | None = None
    budget: str = ""


class CampaignOut(BaseModel):
    id: int
    title: str
    brief_text: str
    parsed_filters: dict[str, Any]
    status: str
    budget: str
    created_at: datetime
    owner_id: int

    model_config = {"from_attributes": True}


class ShortlistAdd(BaseModel):
    creator_id: int
    rank_score: float = 0
    match_reasons: list[str] = []


class FeedbackCreate(BaseModel):
    comment: str
    rating: int | None = Field(default=None, ge=1, le=5)


class FeedbackOut(BaseModel):
    id: int
    author_id: int
    author_name: str
    rating: int | None
    comment: str
    created_at: datetime


class TeamMemberAdd(BaseModel):
    email: EmailStr
    role: str = "member"


class TeamMemberOut(BaseModel):
    id: int
    user_id: int
    email: str
    full_name: str
    role: str
    invited_at: datetime


class ApprovalAction(BaseModel):
    status: str  # approved | rejected


class OutreachMessageCreate(BaseModel):
    subject: str
    body: str
    template_id: int | None = None


class EmailTemplateCreate(BaseModel):
    name: str
    template_type: str
    subject: str
    body: str


class EmailTemplateUpdate(BaseModel):
    name: str | None = None
    subject: str | None = None
    body: str | None = None


class EmailTemplateOut(BaseModel):
    id: int
    name: str
    template_type: str
    subject: str
    body: str
    is_system: bool
    owner_id: int | None

    model_config = {"from_attributes": True}


class TemplatePreviewRequest(BaseModel):
    template_id: int
    creator_handle: str = ""
    creator_name: str = ""
    campaign_title: str = ""
    brand_name: str = ""
    budget: str = ""


class PostCreate(BaseModel):
    creator_id: int
    platform: str = "instagram"
    post_url: str = ""
    likes: int = 0
    comments: int = 0
    views: int = 0


class ShortlistItemOut(BaseModel):
    id: int
    creator: CreatorOut
    rank_score: float
    match_reasons: list[str]
    approval_status: str
    outreach_status: str
    notes: str
    approved_at: datetime | None
    feedback_count: int = 0
