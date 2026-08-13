from __future__ import annotations

import logging

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import SessionLocal
from app.models.entities import Board, CompanyMember, Project, User
from app.websocket.manager import manager

logger = logging.getLogger("taskflow.websocket")

router = APIRouter(tags=["websocket"])


def _authenticate_ws(token: str, project_id: str) -> tuple[User, str]:
    db: Session = SessionLocal()
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Access token required")
        user = db.get(User, payload.get("sub"))
        if user is None:
            raise ValueError("User not found")

        board = (
            db.query(Board)
            .join(Project, Board.project_id == Project.id)
            .filter(
                Board.project_id == project_id,
                Project.company_id == user.company_id,
            )
            .first()
        )
        if board is None:
            raise ValueError("Project board not found")

        membership = (
            db.query(CompanyMember)
            .filter(
                CompanyMember.user_id == user.id,
                CompanyMember.company_id == user.company_id,
            )
            .first()
        )
        if membership is None:
            raise ValueError("Not a company member")

        return user, user.company_id
    finally:
        db.close()


@router.websocket("/ws/board")
async def board_websocket(
    websocket: WebSocket,
    token: str = Query(...),
    project_id: str = Query(...),
):
    try:
        user, company_id = _authenticate_ws(token, project_id)
    except (JWTError, ValueError) as exc:
        logger.warning("WS auth failed: %s", exc)
        await websocket.close(code=4401)
        return

    await manager.connect(websocket, company_id, project_id)
    try:
        await websocket.send_json(
            {
                "type": "connected",
                "project_id": project_id,
                "user_id": user.id,
                "connections": manager.connection_count(company_id, project_id),
            }
        )
        while True:
            # Keep alive; clients may send ping messages.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(websocket, company_id, project_id)
