import random
from datetime import datetime, timedelta

import httpx
from sqlalchemy.orm import Session

from auth_utils import hash_password, verify_password
from config import get_settings
from models import EmailOtpCode

settings = get_settings()
OTP_EXPIRE_MINUTES = 10
OTP_MAX_ATTEMPTS = 5
OTP_RATE_LIMIT_SECONDS = 60


def generate_otp_code() -> str:
    return f"{random.randint(0, 999999):06d}"


def _hash_otp(code: str) -> str:
    return hash_password(code)


def _verify_otp(code: str, code_hash: str) -> bool:
    return verify_password(code, code_hash)


def _recent_otp_exists(db: Session, email: str) -> bool:
    cutoff = datetime.utcnow() - timedelta(seconds=OTP_RATE_LIMIT_SECONDS)
    return (
        db.query(EmailOtpCode)
        .filter(
            EmailOtpCode.email == email.lower(),
            EmailOtpCode.created_at >= cutoff,
        )
        .first()
        is not None
    )


def create_and_send_otp(db: Session, email: str, purpose: str = "register") -> None:
    email = email.lower().strip()
    if _recent_otp_exists(db, email):
        return

    db.query(EmailOtpCode).filter(EmailOtpCode.email == email, EmailOtpCode.purpose == purpose).delete()

    code = generate_otp_code()
    record = EmailOtpCode(
        email=email,
        code_hash=_hash_otp(code),
        purpose=purpose,
        expires_at=datetime.utcnow() + timedelta(minutes=OTP_EXPIRE_MINUTES),
    )
    db.add(record)
    db.commit()

    _send_email(email, code)


def _send_email(email: str, code: str) -> None:
    if settings.RESEND_API_KEY:
        httpx.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {settings.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": settings.FROM_EMAIL,
                "to": [email],
                "subject": "Your Creator verification code",
                "html": (
                    f"<p>Your verification code is:</p>"
                    f"<p style='font-size:28px;font-weight:bold;letter-spacing:4px'>{code}</p>"
                    f"<p>This code expires in {OTP_EXPIRE_MINUTES} minutes.</p>"
                ),
            },
            timeout=15,
        ).raise_for_status()
    elif settings.DEV_MODE:
        print(f"[DEV OTP] {email} -> {code}")
    else:
        raise RuntimeError("RESEND_API_KEY is required when DEV_MODE is disabled")


def verify_otp(db: Session, email: str, code: str, purpose: str = "register") -> bool:
    email = email.lower().strip()
    record = (
        db.query(EmailOtpCode)
        .filter(EmailOtpCode.email == email, EmailOtpCode.purpose == purpose)
        .order_by(EmailOtpCode.created_at.desc())
        .first()
    )
    if not record:
        return False
    if record.expires_at < datetime.utcnow():
        db.delete(record)
        db.commit()
        return False
    if record.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(record)
        db.commit()
        return False

    record.attempts += 1
    db.commit()

    if not _verify_otp(code.strip(), record.code_hash):
        return False

    db.delete(record)
    db.commit()
    return True
