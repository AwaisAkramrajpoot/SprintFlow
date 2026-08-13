from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import (
    ADMIN_PLUS,
    ANY_MEMBER,
    AuthContext,
    OWNER_ONLY,
)
from app.db.session import get_db
from app.schemas.common import MessageResponse
from app.schemas.company import (
    CompanyResponse,
    CompanyUpdate,
    InviteMemberRequest,
    MemberResponse,
    UpdateMemberRoleRequest,
)
from app.services import company_service, workspace_service

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("/me", response_model=CompanyResponse)
def get_current_company(ctx: AuthContext = Depends(ANY_MEMBER)):
    payload = company_service.get_company_payload(ctx.company, ctx.role)
    return CompanyResponse(**payload)


@router.patch("/me", response_model=CompanyResponse)
def update_current_company(
    payload: CompanyUpdate,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    company = company_service.update_company(db, ctx.company, payload)
    data = company_service.get_company_payload(company, ctx.role)
    return CompanyResponse(**data)


@router.delete("/me", response_model=MessageResponse)
def delete_current_company(
    ctx: AuthContext = Depends(OWNER_ONLY),
    db: Session = Depends(get_db),
):
    company_service.delete_company(db, ctx.company)
    return MessageResponse(message="Company deleted")


@router.get("/workspace")
def get_workspace(
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return workspace_service.build_workspace(db, ctx)


@router.get("/members", response_model=list[MemberResponse])
def get_members(
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return [MemberResponse(**item) for item in company_service.list_members(db, ctx.company.id)]


@router.post("/invite", response_model=MemberResponse)
def invite(
    payload: InviteMemberRequest,
    background: BackgroundTasks,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    return MemberResponse(
        **company_service.invite_member(db, ctx.company, ctx.user, payload, background)
    )


@router.patch("/members/{member_id}", response_model=MessageResponse)
def change_role(
    member_id: str,
    payload: UpdateMemberRoleRequest,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    company_service.update_member_role(db, ctx.company.id, member_id, payload.role)
    return MessageResponse(message="Role updated")


@router.delete("/members/{member_id}", response_model=MessageResponse)
def remove_member(
    member_id: str,
    ctx: AuthContext = Depends(ADMIN_PLUS),
    db: Session = Depends(get_db),
):
    company_service.remove_member(db, ctx.company.id, member_id, ctx.user.id)
    return MessageResponse(message="Member removed")
