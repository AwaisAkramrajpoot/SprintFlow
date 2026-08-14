from fastapi import APIRouter

from app.api.v1 import (
    ai,
    attachments,
    auth,
    boards,
    comments,
    companies,
    notifications,
    projects,
    search,
    tasks,
    users,
)


api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(companies.router)
api_router.include_router(projects.router)
api_router.include_router(boards.router)
api_router.include_router(tasks.router)
api_router.include_router(comments.router)
api_router.include_router(attachments.router)
api_router.include_router(notifications.router)
api_router.include_router(search.router)
api_router.include_router(ai.router)
