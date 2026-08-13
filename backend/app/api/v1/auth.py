from fastapi import APIRouter, BackgroundTasks, Depends, Header
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    LogoutRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse)
def register(
    payload: RegisterRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
):
    user, tokens = auth_service.register_user(db, payload, background)
    return AuthResponse(user=UserResponse.model_validate(user), tokens=TokenResponse(**tokens))


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user, tokens = auth_service.login_user(db, payload)
    return AuthResponse(user=UserResponse.model_validate(user), tokens=TokenResponse(**tokens))


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)):
    tokens = auth_service.refresh_tokens(db, payload.refresh_token)
    return TokenResponse(**tokens)


@router.post("/logout", response_model=MessageResponse)
def logout(
    payload: LogoutRequest | None = None,
    authorization: str | None = Header(default=None),
    db: Session = Depends(get_db),
):
    access = None
    if authorization and authorization.lower().startswith("bearer "):
        access = authorization.split(" ", 1)[1]
    refresh_token = payload.refresh_token if payload else None
    auth_service.logout_user(db, access, refresh_token)
    return MessageResponse(message="Logged out")


@router.get("/me", response_model=UserResponse)
def me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
