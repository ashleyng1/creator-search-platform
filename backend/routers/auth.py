import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from auth_utils import (
    create_access_token,
    create_oauth_state,
    get_current_user,
    hash_password,
    verify_oauth_state,
    verify_password,
)
from config import get_settings
from database import get_db
from models import AuthEvent, User, UserRole
from schemas import OtpRequest, OtpVerifyRegister, TokenOut, UserOut, UserRegister
from services.email_otp import create_and_send_otp, verify_otp
from services import oauth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


def _issue_token_response(user: User) -> TokenOut:
    token = create_access_token({"sub": str(user.id)})
    return TokenOut(access_token=token, user=UserOut.model_validate(user))


def _log_event(db: Session, user_id: int | None, event: str, provider: str = "email") -> None:
    db.add(AuthEvent(user_id=user_id, event=event, provider=provider))
    db.commit()


@router.post("/register/request-otp")
def register_request_otp(data: OtpRequest, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        create_and_send_otp(db, email, purpose="register")
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"message": "Verification code sent"}


@router.post("/register/verify", response_model=TokenOut)
def register_verify(data: OtpVerifyRegister, db: Session = Depends(get_db)):
    email = data.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    if not verify_otp(db, email, data.code, purpose="register"):
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")

    user = User(
        email=email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
        role=UserRole(data.role),
        brand_name=data.brand_name,
        job_title=data.job_title,
        industry=data.industry,
        email_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    _log_event(db, user.id, "register")
    return _issue_token_response(user)


@router.post("/register", response_model=TokenOut)
def register_deprecated(data: UserRegister, db: Session = Depends(get_db)):
    raise HTTPException(
        status_code=400,
        detail="Direct registration is disabled. Use /api/auth/register/request-otp then /api/auth/register/verify.",
    )


@router.post("/login", response_model=TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form.username.lower().strip()).first()
    if not user or not user.password_hash:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(form.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.email_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    _log_event(db, user.id, "login")
    return _issue_token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return UserOut.model_validate(user)


@router.get("/google/start")
def google_start():
    try:
        state = create_oauth_state("google")
        url = oauth_service.google_authorize_url(state)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return RedirectResponse(url)


@router.get("/google/callback")
def google_callback(code: str, state: str, db: Session = Depends(get_db)):
    verify_oauth_state(state, "google")
    try:
        return RedirectResponse(oauth_service.google_handle_callback(db, code))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Google sign-in failed: {exc}") from exc


@router.get("/apple/start")
def apple_start():
    try:
        state = create_oauth_state("apple")
        url = oauth_service.apple_authorize_url(state)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return RedirectResponse(url)


@router.post("/apple/callback")
async def apple_callback(request: Request, db: Session = Depends(get_db)):
    form = await request.form()
    code = form.get("code")
    state = form.get("state")
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing Apple OAuth parameters")
    verify_oauth_state(str(state), "apple")
    user_json = None
    raw_user = form.get("user")
    if raw_user:
        try:
            user_json = json.loads(str(raw_user))
        except json.JSONDecodeError:
            user_json = None
    try:
        return RedirectResponse(oauth_service.apple_handle_callback(db, str(code), user_json))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Apple sign-in failed: {exc}") from exc


@router.get("/meta/start")
def meta_start():
    try:
        state = create_oauth_state("meta")
        url = oauth_service.meta_authorize_url(state)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return RedirectResponse(url)


@router.get("/meta/callback")
def meta_callback(code: str, state: str, db: Session = Depends(get_db)):
    verify_oauth_state(state, "meta")
    try:
        return RedirectResponse(oauth_service.meta_handle_callback(db, code))
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Instagram sign-in failed: {exc}") from exc
