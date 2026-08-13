from __future__ import annotations

import logging
from typing import Any

from app.models.entities import Task
from app.services.serializers import task_to_dict
from app.websocket.manager import manager

logger = logging.getLogger("taskflow.broadcast")


def _project_id_for_task(task: Task) -> str | None:
    if task.board and task.board.project_id:
        return task.board.project_id
    return None


async def _emit(
    company_id: str,
    project_id: str,
    event_type: str,
    payload: dict[str, Any],
) -> None:
    await manager.broadcast(
        company_id,
        project_id,
        {"type": event_type, "project_id": project_id, **payload},
    )


async def broadcast_task_created(task: Task) -> None:
    project_id = _project_id_for_task(task)
    if not project_id:
        return
    await _emit(
        task.company_id,
        project_id,
        "task.created",
        {"task": task_to_dict(task)},
    )


async def broadcast_task_updated(task: Task) -> None:
    project_id = _project_id_for_task(task)
    if not project_id:
        return
    await _emit(
        task.company_id,
        project_id,
        "task.updated",
        {"task": task_to_dict(task)},
    )


async def broadcast_task_deleted(
    company_id: str, project_id: str, task_id: str
) -> None:
    await _emit(
        company_id,
        project_id,
        "task.deleted",
        {"task_id": task_id},
    )


async def broadcast_task_moved(task: Task) -> None:
    project_id = _project_id_for_task(task)
    if not project_id:
        return
    await _emit(
        task.company_id,
        project_id,
        "task.moved",
        {"task": task_to_dict(task)},
    )
