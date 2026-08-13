from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user
from app.models.entities import User
from app.schemas.auth import UserResponse

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def read_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
