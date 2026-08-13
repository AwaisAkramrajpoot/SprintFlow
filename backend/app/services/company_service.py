from fastapi import BackgroundTasks
from sqlalchemy.orm import Session, joinedload

from app.core.enums import MemberRole
from app.core.exceptions import bad_request, forbidden, not_found
from app.core.extended_settings import extended_settings
from app.core.security import create_refresh_token_value, hash_token
from app.models.entities import Company, CompanyInvite, CompanyMember, User
from app.schemas.company import CompanyUpdate, InviteMemberRequest
from app.services.email_service import invite_email, send_email


def get_company_payload(company: Company, role: str) -> dict:
    return {
        "id": company.id,
        "name": company.name,
        "plan": company.plan,
        "created_at": company.created_at,
        "createdAt": company.created_at.isoformat() if company.created_at else None,
        "role": role,
    }


def update_company(db: Session, company: Company, payload: CompanyUpdate) -> Company:
    if payload.name is not None:
        company.name = payload.name.strip()
    if payload.plan is not None:
        company.plan = payload.plan.value
    db.commit()
    db.refresh(company)
    return company


def delete_company(db: Session, company: Company) -> None:
    db.delete(company)
    db.commit()


def list_members(db: Session, company_id: str) -> list[dict]:
    rows = (
        db.query(CompanyMember)
        .options(joinedload(CompanyMember.user))
        .filter(CompanyMember.company_id == company_id)
        .all()
    )
    return [
        {
            "id": row.user_id,
            "user_id": row.user_id,
            "name": row.user.full_name if row.user else "",
            "email": row.user.email if row.user else "",
            "role": row.role,
            "status": "Online",
        }
        for row in rows
    ]


def invite_member(
    db: Session,
    company: Company,
    invited_by: User,
    payload: InviteMemberRequest,
    background: BackgroundTasks,
) -> dict:
    email = payload.email.lower()
    if payload.role == MemberRole.OWNER:
        raise bad_request("Cannot invite another Owner")

    existing_user = db.query(User).filter(User.email == email).first()
    if existing_user:
        membership = (
            db.query(CompanyMember)
            .filter(
                CompanyMember.user_id == existing_user.id,
                CompanyMember.company_id == company.id,
            )
            .first()
        )
        if membership:
            raise bad_request("User is already a member of this company")

        membership = CompanyMember(
            user_id=existing_user.id,
            company_id=company.id,
            role=payload.role.value,
        )
        db.add(membership)
        if existing_user.company_id is None:
            existing_user.company_id = company.id
            existing_user.role = payload.role.value
        db.commit()
        token = create_refresh_token_value()
        invite_url = f"{extended_settings.frontend_url}/login"
        subject, html = invite_email(company.name, payload.role.value, invite_url)
        background.add_task(send_email, email, subject, html)
        return {
            "id": existing_user.id,
            "name": existing_user.full_name,
            "email": existing_user.email,
            "role": payload.role.value,
            "user_id": existing_user.id,
            "status": "Online",
        }

    token = create_refresh_token_value()
    existing_invite = (
        db.query(CompanyInvite)
        .filter(
            CompanyInvite.company_id == company.id,
            CompanyInvite.email == email,
            CompanyInvite.accepted.is_(False),
        )
        .first()
    )
    if existing_invite:
        existing_invite.role = payload.role.value
        existing_invite.token_hash = hash_token(token)
        existing_invite.invited_by = invited_by.id
        invite = existing_invite
    else:
        invite = CompanyInvite(
            company_id=company.id,
            email=email,
            role=payload.role.value,
            token_hash=hash_token(token),
            invited_by=invited_by.id,
        )
        db.add(invite)
    db.commit()

    invite_url = (
        f"{extended_settings.frontend_url}/register?invite={token}&email={email}"
    )
    subject, html = invite_email(company.name, payload.role.value, invite_url)
    background.add_task(send_email, email, subject, html)

    return {
        "id": invite.id,
        "user_id": invite.id,
        "name": payload.name or email,
        "email": email,
        "role": payload.role.value,
        "status": "Invited",
        "invite_token": token,
    }


def update_member_role(
    db: Session, company_id: str, member_user_id: str, role: MemberRole
) -> None:
    if role == MemberRole.OWNER:
        raise bad_request("Use ownership transfer to assign Owner")
    membership = (
        db.query(CompanyMember)
        .filter(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == member_user_id,
        )
        .first()
    )
    if membership is None:
        raise not_found("Member")
    if membership.role == MemberRole.OWNER.value:
        raise forbidden("Owner role cannot be changed")
    membership.role = role.value
    user = db.get(User, member_user_id)
    if user and user.company_id == company_id:
        user.role = role.value
    db.commit()


def remove_member(db: Session, company_id: str, member_user_id: str, actor_id: str) -> None:
    if member_user_id == actor_id:
        raise bad_request("You cannot remove yourself")
    membership = (
        db.query(CompanyMember)
        .filter(
            CompanyMember.company_id == company_id,
            CompanyMember.user_id == member_user_id,
        )
        .first()
    )
    if membership is None:
        raise not_found("Member")
    if membership.role == MemberRole.OWNER.value:
        raise forbidden("Owner cannot be removed")
    db.delete(membership)
    user = db.get(User, member_user_id)
    if user and user.company_id == company_id:
        user.company_id = None
    db.commit()
