from datetime import datetime, timedelta
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import CampaignMember, CampaignRole, User

SECRET_KEY = "creator-search-local-dev-secret-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError as exc:
        raise credentials_exception from exc

    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise credentials_exception
    return user


def get_campaign_member(
    db: Session, campaign_id: int, user_id: int
) -> CampaignMember | None:
    return (
        db.query(CampaignMember)
        .filter(CampaignMember.campaign_id == campaign_id, CampaignMember.user_id == user_id)
        .first()
    )


def require_campaign_access(
    db: Session, campaign_id: int, user: User, min_role: CampaignRole | None = None
) -> CampaignMember:
    from models import Campaign

    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if campaign.owner_id == user.id:
        return CampaignMember(campaign_id=campaign_id, user_id=user.id, role=CampaignRole.manager)

    member = get_campaign_member(db, campaign_id, user.id)
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this campaign")

    role_rank = {
        CampaignRole.member: 1,
        CampaignRole.manager: 2,
        CampaignRole.approver: 3,
    }
    if min_role and role_rank[member.role] < role_rank[min_role]:
        if member.role != CampaignRole.approver and min_role == CampaignRole.approver:
            raise HTTPException(status_code=403, detail="Approver role required")
        if member.role == CampaignRole.member and min_role in (
            CampaignRole.manager,
            CampaignRole.approver,
        ):
            if min_role == CampaignRole.manager:
                raise HTTPException(status_code=403, detail="Manager role required")
    return member


def can_approve(user: User, member: CampaignMember, campaign_owner_id: int) -> bool:
    if user.id == campaign_owner_id:
        return True
    return member.role in (CampaignRole.approver, CampaignRole.manager)
