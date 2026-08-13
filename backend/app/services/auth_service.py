from datetime import datetime, timedelta, timezone

from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.core.enums import CompanyPlan, MemberRole
from app.core.exceptions import bad_request, unauthorized
from app.core.extended_settings import extended_settings
from app.core.redis_client import get_redis
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.entities import Company, CompanyMember, RefreshToken, User
from app.repositories.users import CompanyRepository, UserRepository
from app.schemas.auth import LoginRequest, RegisterRequest
from app.services.email_service import send_email, welcome_email


def _issue_tokens(db: Session, user: User) -> dict:
    access = create_access_token(user.id, extra={"company_id": user.company_id})
    refresh = create_refresh_token_value()
    record = RefreshToken(
        user_id=user.id,
        token_hash=hash_token(refresh),
        expires_at=datetime.now(timezone.utc)
        + timedelta(days=extended_settings.refresh_token_expire_days),
    )
    db.add(record)
    db.commit()
    return {
        "access_token": access,
        "refresh_token": refresh,
        "token_type": "bearer",
    }


def register_user(
    db: Session, payload: RegisterRequest, background: BackgroundTasks
) -> tuple[User, dict]:
    users = UserRepository(db)
    companies = CompanyRepository(db)
    existing = users.get_by_email(payload.email)
    if existing:
        raise bad_request("An account with this email already exists")

    invite = None
    if payload.invite_token:
        invite = companies.get_invite_by_hash(hash_token(payload.invite_token))
        if invite is None:
            raise bad_request("Invite token is invalid or already used")
        if invite.email.lower() != payload.email.lower():
            raise bad_request("Invite email does not match this account")

    if invite is None and not payload.company_name:
        raise bad_request("Provide a company name or a valid invite token")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name.strip(),
        role=MemberRole.OWNER.value if invite is None else invite.role,
    )
    db.add(user)
    db.flush()

    if invite:
        company = db.get(Company, invite.company_id)
        role = invite.role
        invite.accepted = True
    else:
        company = Company(name=payload.company_name.strip(), plan=CompanyPlan.FREE.value)
        db.add(company)
        db.flush()
        role = MemberRole.OWNER.value

    user.company_id = company.id
    user.role = role
    db.add(
        CompanyMember(
            user_id=user.id,
            company_id=company.id,
            role=role,
        )
    )
    db.commit()
    db.refresh(user)

    if invite is None:
        subject, html = welcome_email(user.full_name, company.name)
        background.add_task(send_email, user.email, subject, html)

    tokens = _issue_tokens(db, user)
    return user, tokens


def login_user(db: Session, payload: LoginRequest) -> tuple[User, dict]:
    user = UserRepository(db).get_by_email(payload.email)
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise unauthorized("Invalid email or password")
    return user, _issue_tokens(db, user)


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    token_hash = hash_token(refresh_token)
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash, RefreshToken.revoked.is_(False))
        .first()
    )
    if record is None:
        raise unauthorized("Refresh token is invalid")
    expires = record.expires_at
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if expires < datetime.now(timezone.utc):
        record.revoked = True
        db.commit()
        raise unauthorized("Refresh token has expired")

    user = db.get(User, record.user_id)
    if user is None:
        raise unauthorized("User not found")

    record.revoked = True
    db.commit()
    return _issue_tokens(db, user)


def logout_user(db: Session, access_token: str | None, refresh_token: str | None) -> None:
    if refresh_token:
        record = (
            db.query(RefreshToken)
            .filter(RefreshToken.token_hash == hash_token(refresh_token))
            .first()
        )
        if record:
            record.revoked = True
            db.commit()

    if not access_token:
        return

    try:
        payload = decode_token(access_token)
    except Exception:  # noqa: BLE001
        return

    jti = payload.get("jti")
    exp = payload.get("exp")
    client = get_redis()
    if client is None or not jti or not exp:
        return

    ttl = max(int(exp - datetime.utcnow().timestamp()), 1)
    try:
        client.setex(f"taskflow:denylist:{jti}", ttl, "1")
    except Exception:  # noqa: BLE001
        return
