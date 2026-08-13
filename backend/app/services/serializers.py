from datetime import datetime, timezone

from app.models.entities import Attachment, Comment, Notification, Project, Task, User


def relative_time(value: datetime | None) -> str:
    if value is None:
        return ""
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    delta = datetime.now(timezone.utc) - value
    minutes = int(delta.total_seconds() // 60)
    if minutes < 1:
        return "Just now"
    if minutes < 60:
        return f"{minutes}m ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours}h ago"
    days = hours // 24
    return f"{days}d ago"


def user_public(user: User, role: str | None = None) -> dict:
    return {
        "id": user.id,
        "name": user.full_name,
        "email": user.email,
        "title": role or user.role,
        "role": role or user.role,
        "company_id": user.company_id,
    }


def comment_to_dict(comment: Comment) -> dict:
    return {
        "id": comment.id,
        "task_id": comment.task_id,
        "userId": comment.user_id,
        "user_id": comment.user_id,
        "author": comment.user.full_name if comment.user else None,
        "content": comment.content,
        "createdAt": comment.created_at.isoformat() if comment.created_at else None,
        "created_at": comment.created_at,
    }


def attachment_to_dict(item: Attachment) -> dict:
    size = f"{item.size_bytes} B" if item.size_bytes else "—"
    if item.size_bytes and item.size_bytes >= 1024:
        size = f"{item.size_bytes / 1024:.1f} KB"
    return {
        "id": item.id,
        "task_id": item.task_id,
        "file_url": item.file_url,
        "name": item.original_name,
        "size": size,
        "uploadedBy": item.uploader.full_name if item.uploader else None,
        "uploaded_by": item.uploader.full_name if item.uploader else None,
        "uploadedAt": item.created_at.date().isoformat() if item.created_at else None,
        "uploaded_at": item.created_at,
    }


def task_to_dict(task: Task) -> dict:
    project_id = task.board.project_id if task.board else None
    return {
        "id": task.id,
        "projectId": project_id,
        "project_id": project_id,
        "board_id": task.board_id,
        "column_id": task.column_id,
        "title": task.title,
        "description": task.description or "",
        "status": task.status,
        "priority": task.priority,
        "assigneeId": task.assignee_id,
        "assignee_id": task.assignee_id,
        "assignee": task.assignee.full_name if task.assignee else "Unassigned",
        "dueDate": task.due_date.isoformat() if task.due_date else None,
        "due_date": task.due_date,
        "created_by": task.created_by,
        "createdBy": task.creator.full_name if task.creator else None,
        "created_at": task.created_at,
        "comments": [comment_to_dict(item) for item in (task.comments or [])],
        "attachments": [attachment_to_dict(item) for item in (task.attachments or [])],
        "checklist": [],
    }


def project_to_dict(project: Project, tasks: list[Task], member_count: int) -> dict:
    total = len(tasks)
    done = len([task for task in tasks if task.status == "Done"])
    progress = int((done / total) * 100) if total else 0
    overdue = any(
        task.due_date and task.status != "Done" and str(task.due_date) < datetime.now().date().isoformat()
        for task in tasks
        if task.due_date
    )
    return {
        "id": project.id,
        "company_id": project.company_id,
        "name": project.name,
        "description": project.description or "",
        "created_by": project.created_by,
        "created_at": project.created_at,
        "lead": project.creator.full_name if project.creator else None,
        "progress": progress,
        "status": "At Risk" if overdue else "On Track",
        "members": member_count,
        "dueDate": None,
        "due_date": None,
    }


def notification_to_dict(item: Notification) -> dict:
    title = "Notification"
    ntype = "system"
    lowered = item.message.lower()
    if "assigned" in lowered:
        title, ntype = "Task assigned", "assignment"
    elif "comment" in lowered:
        title, ntype = "Comment added", "comment"
    elif "invite" in lowered:
        title, ntype = "Member invited", "system"
    elif "moved" in lowered or "board" in lowered:
        title, ntype = "Board update", "board"
    return {
        "id": item.id,
        "title": title,
        "message": item.message,
        "unread": not item.is_read,
        "time": relative_time(item.created_at),
        "type": ntype,
        "created_at": item.created_at,
    }
