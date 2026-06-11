import time
from urllib.parse import urlencode

import httpx
from jose import jwt as jose_jwt
from sqlalchemy.orm import Session

from auth_utils import create_access_token
from config import get_settings
from models import AuthEvent, OAuthAccount, User, UserRole

settings = get_settings()


def _log_auth_event(db: Session, user_id: int | None, event: str, provider: str) -> None:
    db.add(AuthEvent(user_id=user_id, event=event, provider=provider))
    db.commit()


def _upsert_oauth_user(
    db: Session,
    *,
    provider: str,
    provider_user_id: str,
    email: str,
    full_name: str,
) -> User:
    email = email.lower().strip()
    oauth = (
        db.query(OAuthAccount)
        .filter(
            OAuthAccount.provider == provider,
            OAuthAccount.provider_user_id == provider_user_id,
        )
        .first()
    )
    if oauth:
        user = oauth.user
        if email and user.email != email:
            user.email = email
            db.commit()
        _log_auth_event(db, user.id, "login", provider)
        return user

    user = db.query(User).filter(User.email == email).first() if email else None
    if not user:
        user = User(
            email=email or f"{provider}_{provider_user_id}@oauth.local",
            password_hash="",
            full_name=full_name or email.split("@")[0],
            role=UserRole.marketing_professional,
            email_verified=True,
        )
        db.add(user)
        db.flush()

    db.add(
        OAuthAccount(
            user_id=user.id,
            provider=provider,
            provider_user_id=provider_user_id,
            email=email,
        )
    )
    db.commit()
    db.refresh(user)
    _log_auth_event(db, user.id, "register" if not oauth else "login", provider)
    return user


def issue_token_for_user(user: User) -> str:
    return create_access_token({"sub": str(user.id)})


def redirect_with_token(token: str) -> str:
    return f"{settings.FRONTEND_URL}/auth/callback?token={token}"


# --- Google ---

def google_authorize_url(state: str) -> str:
    if not settings.GOOGLE_CLIENT_ID:
        raise ValueError("Google OAuth is not configured")
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"


def google_handle_callback(db: Session, code: str) -> str:
    token_resp = httpx.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            "grant_type": "authorization_code",
        },
        timeout=15,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]

    profile = httpx.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    profile.raise_for_status()
    data = profile.json()

    user = _upsert_oauth_user(
        db,
        provider="google",
        provider_user_id=str(data["id"]),
        email=data.get("email", ""),
        full_name=data.get("name", ""),
    )
    return redirect_with_token(issue_token_for_user(user))


# --- Apple ---

def _apple_client_secret() -> str:
    claims = {
        "iss": settings.APPLE_TEAM_ID,
        "iat": int(time.time()),
        "exp": int(time.time()) + 3600,
        "aud": "https://appleid.apple.com",
        "sub": settings.APPLE_CLIENT_ID,
    }
    return jose_jwt.encode(
        claims,
        settings.APPLE_PRIVATE_KEY,
        algorithm="ES256",
        headers={"kid": settings.APPLE_KEY_ID},
    )


def apple_authorize_url(state: str) -> str:
    if not settings.APPLE_CLIENT_ID:
        raise ValueError("Apple OAuth is not configured")
    params = {
        "client_id": settings.APPLE_CLIENT_ID,
        "redirect_uri": settings.APPLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "name email",
        "state": state,
        "response_mode": "form_post",
    }
    return f"https://appleid.apple.com/auth/authorize?{urlencode(params)}"


def apple_handle_callback(db: Session, code: str, user_json: dict | None = None) -> str:
    token_resp = httpx.post(
        "https://appleid.apple.com/auth/token",
        data={
            "client_id": settings.APPLE_CLIENT_ID,
            "client_secret": _apple_client_secret(),
            "code": code,
            "grant_type": "authorization_code",
            "redirect_uri": settings.APPLE_REDIRECT_URI,
        },
        timeout=15,
    )
    token_resp.raise_for_status()
    id_token = token_resp.json().get("id_token")
    claims = jose_jwt.get_unverified_claims(id_token)

    email = claims.get("email", "")
    sub = str(claims["sub"])
    full_name = ""
    if user_json and user_json.get("name"):
        name = user_json["name"]
        full_name = f"{name.get('firstName', '')} {name.get('lastName', '')}".strip()

    user = _upsert_oauth_user(
        db,
        provider="apple",
        provider_user_id=sub,
        email=email,
        full_name=full_name,
    )
    return redirect_with_token(issue_token_for_user(user))


# --- Meta (Instagram button) ---

def meta_authorize_url(state: str) -> str:
    if not settings.META_APP_ID:
        raise ValueError("Meta OAuth is not configured")
    params = {
        "client_id": settings.META_APP_ID,
        "redirect_uri": settings.META_REDIRECT_URI,
        "response_type": "code",
        "scope": "email,public_profile",
        "state": state,
    }
    return f"https://www.facebook.com/v21.0/dialog/oauth?{urlencode(params)}"


def meta_handle_callback(db: Session, code: str) -> str:
    token_resp = httpx.get(
        "https://graph.facebook.com/v21.0/oauth/access_token",
        params={
            "client_id": settings.META_APP_ID,
            "client_secret": settings.META_APP_SECRET,
            "redirect_uri": settings.META_REDIRECT_URI,
            "code": code,
        },
        timeout=15,
    )
    token_resp.raise_for_status()
    access_token = token_resp.json()["access_token"]

    profile = httpx.get(
        "https://graph.facebook.com/me",
        params={"fields": "id,name,email", "access_token": access_token},
        timeout=15,
    )
    profile.raise_for_status()
    data = profile.json()

    user = _upsert_oauth_user(
        db,
        provider="meta",
        provider_user_id=str(data["id"]),
        email=data.get("email", ""),
        full_name=data.get("name", ""),
    )
    return redirect_with_token(issue_token_for_user(user))
