from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, AuthContext
from app.db.session import get_db
from app.services import search_service
from app.services.serializers import task_to_dict

router = APIRouter(prefix="/search", tags=["search"])


@router.get("")
def search(
    q: str = Query(..., min_length=1),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    items, total = search_service.search_tasks(db, ctx.company.id, q, limit, offset)
    return {
        "items": [task_to_dict(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
        "q": q,
    }
