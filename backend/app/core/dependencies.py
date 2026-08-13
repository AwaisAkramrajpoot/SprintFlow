from dataclasses import dataclass

from fastapi import Depends, Header
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.enums import MemberRole
from app.core.exceptions import forbidden, unauthorized
from app.core.redis_client import get_redis
from app.core.security import decode_token
from app.db.session import get_db
from app.models.entities import Company, CompanyMember, User

bearer_scheme = HTTPBearer(auto_error=False)

ROLE_RANK = {
    MemberRole.MEMBER.value: 1,
    MemberRole.MANAGER.value: 2,
    MemberRole.ADMIN.value: 3,
    MemberRole.OWNER.value: 4,
}


@dataclass
class AuthContext:
    user: User
    membership: CompanyMember
    company: Company
    role: str


def get_app_name() -> str:
    from app.core.config import settings

    return settings.app_name


def _is_denylisted(jti: str | None) -> bool:
    if not jti:
        return False
    client = get_redis()
    if client is None:
        return False
    try:
        return bool(client.exists(f"taskflow:denylist:{jti}"))
    except Exception:  # noqa: BLE001
        return False


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise unauthorized()

    try:
        payload = decode_token(credentials.credentials)
    except JWTError as exc:
        raise unauthorized("Invalid or expired token") from exc

    if payload.get("type") != "access":
        raise unauthorized("Access token required")
    if _is_denylisted(payload.get("jti")):
        raise unauthorized("Token has been revoked")

    user_id = payload.get("sub")
    user = db.get(User, user_id) if user_id else None
    if user is None:
        raise unauthorized("User not found")
    return user


def get_auth_context(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    x_company_id: str | None = Header(default=None, alias="X-Company-Id"),
) -> AuthContext:
    company_id = x_company_id or user.company_id
    if not company_id:
        raise forbidden("User is not attached to a company")

    membership = (
        db.query(CompanyMember)
        .filter(
            CompanyMember.user_id == user.id,
            CompanyMember.company_id == company_id,
        )
        .first()
    )
    if membership is None:
        raise forbidden("You are not a member of this company")

    company = db.get(Company, company_id)
    if company is None:
        raise forbidden("Company not found")

    return AuthContext(
        user=user,
        membership=membership,
        company=company,
        role=membership.role,
    )


def require_role(*allowed_roles: str):
    allowed = {role.value if isinstance(role, MemberRole) else role for role in allowed_roles}

    def _checker(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if ctx.role not in allowed:
            raise forbidden("Insufficient permissions for this action")
        return ctx

    return _checker


def require_min_role(minimum: MemberRole):
    threshold = ROLE_RANK[minimum.value]

    def _checker(ctx: AuthContext = Depends(get_auth_context)) -> AuthContext:
        if ROLE_RANK.get(ctx.role, 0) < threshold:
            raise forbidden("Insufficient permissions for this action")
        return ctx

    return _checker


ADMIN_PLUS = require_min_role(MemberRole.ADMIN)
MANAGER_PLUS = require_min_role(MemberRole.MANAGER)
ANY_MEMBER = get_auth_context
OWNER_ONLY = require_role(MemberRole.OWNER.value)
