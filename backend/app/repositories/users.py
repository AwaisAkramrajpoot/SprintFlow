from sqlalchemy.orm import Session

from app.models.entities import Company, CompanyInvite, CompanyMember, User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository):
    def get(self, user_id: str) -> User | None:
        return self.db.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email.lower()).first()


class CompanyRepository(BaseRepository):
    def get(self, company_id: str) -> Company | None:
        return self.db.get(Company, company_id)

    def get_membership(self, user_id: str, company_id: str) -> CompanyMember | None:
        return (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.user_id == user_id,
                CompanyMember.company_id == company_id,
            )
            .first()
        )

    def list_members(self, company_id: str) -> list[CompanyMember]:
        return (
            self.db.query(CompanyMember)
            .filter(CompanyMember.company_id == company_id)
            .all()
        )

    def get_invite_by_hash(self, token_hash: str) -> CompanyInvite | None:
        return (
            self.db.query(CompanyInvite)
            .filter(
                CompanyInvite.token_hash == token_hash,
                CompanyInvite.accepted.is_(False),
            )
            .first()
        )

    def get_pending_invite(self, company_id: str, email: str) -> CompanyInvite | None:
        return (
            self.db.query(CompanyInvite)
            .filter(
                CompanyInvite.company_id == company_id,
                CompanyInvite.email == email.lower(),
                CompanyInvite.accepted.is_(False),
            )
            .first()
        )
