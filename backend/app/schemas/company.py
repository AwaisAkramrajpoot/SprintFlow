from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.core.enums import CompanyPlan, MemberRole


class CompanyUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    plan: CompanyPlan | None = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    plan: str
    created_at: datetime
    role: str | None = None

    model_config = {"from_attributes": True}


class InviteMemberRequest(BaseModel):
    email: EmailStr
    role: MemberRole = MemberRole.MEMBER
    name: str | None = None


class UpdateMemberRoleRequest(BaseModel):
    role: MemberRole


class MemberResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    role: str
    status: str = "Online"
    invite_token: str | None = None

    model_config = {"from_attributes": True}
