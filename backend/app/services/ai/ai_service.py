from __future__ import annotations

import json
import logging
from collections import defaultdict
from datetime import date, timedelta
from pathlib import Path

from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import bad_request, service_unavailable
from app.core.extended_settings import extended_settings
from app.models.entities import Company, Task, User
from app.services.ai.llm_client import invoke_json, invoke_text, require_openai_key
from app.services.company_service import list_members
from app.services.serializers import task_to_dict
from app.services.task_service import create_task, list_tasks

logger = logging.getLogger("taskflow.ai")

ALLOWED_CODE_SUFFIXES = {
    ".py",
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".java",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".cs",
    ".css",
    ".html",
    ".sql",
    ".json",
    ".yml",
    ".yaml",
    ".md",
    ".txt",
}


def _safe_priority(value: str | None) -> str:
    allowed = {"Urgent", "High", "Medium", "Low"}
    if value in allowed:
        return value
    if isinstance(value, str):
        titled = value.strip().title()
        if titled in allowed:
            return titled
    return "Medium"


def generate_tasks(description: str) -> dict:
    data = invoke_json(
        "You are a senior project manager. Return JSON only with keys: "
        "summary (string) and tasks (array). Each task has title, description, "
        "group (frontend|backend|design|qa|devops|general), priority "
        "(Urgent|High|Medium|Low), estimated_hours (number), subtasks (string array).",
        f"Break this project into implementation tasks:\n\n{description}",
        temperature=0.3,
    )
    tasks = []
    for item in data.get("tasks") or []:
        if not isinstance(item, dict) or not item.get("title"):
            continue
        tasks.append(
            {
                "title": str(item["title"]).strip(),
                "description": str(item.get("description") or "").strip(),
                "group": str(item.get("group") or "general"),
                "priority": _safe_priority(item.get("priority")),
                "estimated_hours": float(item.get("estimated_hours") or 4),
                "subtasks": [
                    str(sub).strip()
                    for sub in (item.get("subtasks") or [])
                    if str(sub).strip()
                ],
            }
        )
    return {"summary": data.get("summary") or "", "tasks": tasks}


def commit_generated_tasks(
    db: Session,
    company_id: str,
    actor: User,
    project_id: str,
    tasks: list[dict],
) -> list[Task]:
    created = []
    for item in tasks:
        description = item.get("description") or ""
        subtasks = item.get("subtasks") or []
        if subtasks:
            checklist = "\n".join(f"- [ ] {step}" for step in subtasks)
            description = f"{description}\n\nChecklist:\n{checklist}".strip()
        created.append(
            create_task(
                db,
                company_id,
                actor,
                title=item["title"],
                description=description,
                project_id=project_id,
                board_id=None,
                column_id=None,
                status="Backlog",
                priority=_safe_priority(item.get("priority")),
                due_date=None,
                assignee_id=None,
                assignee=None,
            )
        )
    return created


def estimate_task(title: str, context: str | None = None) -> dict:
    extra = f"\nContext: {context}" if context else ""
    data = invoke_json(
        "You are a software estimation assistant. Return JSON with "
        "estimated_hours (number), confidence (low|medium|high), "
        "checklist (array of technical requirements), notes (string).",
        f"Estimate this task: {title}{extra}",
    )
    return {
        "estimated_hours": float(data.get("estimated_hours") or 4),
        "confidence": data.get("confidence") or "medium",
        "checklist": [str(item) for item in (data.get("checklist") or [])],
        "notes": data.get("notes") or "",
    }


def generate_description(title: str, context: str | None = None) -> dict:
    extra = f"\nContext: {context}" if context else ""
    data = invoke_json(
        "You write professional software task specs. Return JSON with "
        "description (string), requirements (string array), "
        "acceptance_criteria (string array).",
        f"Expand this title into a full task description: {title}{extra}",
        temperature=0.4,
    )
    return {
        "description": data.get("description") or "",
        "requirements": [str(item) for item in (data.get("requirements") or [])],
        "acceptance_criteria": [
            str(item) for item in (data.get("acceptance_criteria") or [])
        ],
    }


def _pending_tasks_for_sprint(db: Session, company_id: str, project_id: str | None):
    items, _ = list_tasks(
        db,
        company_id,
        project_id=project_id,
        status=None,
        limit=100,
        offset=0,
    )
    pending = [task for task in items if task.status != "Done"]
    return pending


def plan_sprint(
    db: Session,
    company_id: str,
    developers: list[dict],
    tasks: list[dict] | None,
    project_id: str | None,
    sprint_hours: float,
) -> dict:
    if not developers:
        raise bad_request("At least one developer is required")

    if not tasks:
        pending = _pending_tasks_for_sprint(db, company_id, project_id)
        tasks = [
            {
                "title": task.title,
                "estimated_hours": 4,
                "priority": task.priority,
            }
            for task in pending
        ]

    payload = {
        "sprint_hours": sprint_hours,
        "developers": developers,
        "tasks": tasks,
    }
    data = invoke_json(
        "You are a sprint planner. Balance load fairly. Return JSON with "
        "allocations (array of {developer, tasks:[{title, estimated_hours}], "
        "total_hours}), unassigned (string array), notes (string). "
        "Do not exceed each developer's available hours.",
        json.dumps(payload),
        temperature=0.2,
    )
    return {
        "allocations": data.get("allocations") or [],
        "unassigned": data.get("unassigned") or [],
        "notes": data.get("notes") or "",
    }


def summarize_comments(db: Session, company_id: str, task_id: str) -> dict:
    from app.services.comment_service import list_comments
    from app.services.task_service import get_company_task

    task = get_company_task(db, company_id, task_id)
    comments = list_comments(db, company_id, task_id)
    if not comments:
        return {
            "main_issue": "No comments yet",
            "proposed_solution": "Add discussion before summarizing.",
            "current_status": task.status,
            "summary": "This task has no comments to summarize.",
        }
    thread = "\n".join(
        f"- {item.user.full_name if item.user else 'Unknown'}: {item.content}"
        for item in comments
    )
    data = invoke_json(
        "Summarize a task comment thread. Return JSON with main_issue, "
        "proposed_solution, current_status, summary.",
        f"Task: {task.title}\nStatus: {task.status}\nComments:\n{thread}",
    )
    return {
        "main_issue": data.get("main_issue") or "",
        "proposed_solution": data.get("proposed_solution") or "",
        "current_status": data.get("current_status") or task.status,
        "summary": data.get("summary") or "",
    }


def nl_search(db: Session, company_id: str, query: str, project_id: str | None) -> dict:
    members = list_members(db, company_id)
    member_hint = ", ".join(f"{item['name']} ({item['id']})" for item in members)
    today = date.today().isoformat()
    data = invoke_json(
        "Convert a natural language task search into filters. Return JSON with "
        "status (Backlog|In Progress|Review|Done or null), "
        "priority (Urgent|High|Medium|Low or null), "
        "assignee_name (string or null), due_from (YYYY-MM-DD or null), "
        "due_to (YYYY-MM-DD or null), q (keyword string or null). "
        f"Today is {today}. Known members: {member_hint}",
        query,
    )
    assignee_id = None
    assignee_name = (data.get("assignee_name") or "").strip().lower()
    if assignee_name:
        match = next(
            (
                item
                for item in members
                if assignee_name in (item["name"] or "").lower()
                or assignee_name in (item["email"] or "").lower()
            ),
            None,
        )
        if match:
            assignee_id = match["id"]

    due_from = data.get("due_from")
    due_to = data.get("due_to")
    try:
        due_from = date.fromisoformat(str(due_from)[:10]) if due_from else None
    except ValueError:
        due_from = None
    try:
        due_to = date.fromisoformat(str(due_to)[:10]) if due_to else None
    except ValueError:
        due_to = None
    items, total = list_tasks(
        db,
        company_id,
        project_id=project_id or None,
        status=data.get("status"),
        priority=data.get("priority"),
        assignee_id=assignee_id,
        q=data.get("q"),
        due_from=due_from,
        due_to=due_to,
        limit=50,
        offset=0,
    )
    return {
        "filters": {
            "status": data.get("status"),
            "priority": data.get("priority"),
            "assignee_id": assignee_id,
            "assignee_name": data.get("assignee_name"),
            "due_from": due_from,
            "due_to": due_to,
            "q": data.get("q"),
        },
        "total": total,
        "items": [task_to_dict(item) for item in items],
    }


def workspace_stats(db: Session, company_id: str, project_id: str | None = None) -> dict:
    items, total = list_tasks(
        db, company_id, project_id=project_id, limit=200, offset=0
    )
    today = date.today()
    yesterday = today - timedelta(days=1)
    pending = [task for task in items if task.status != "Done"]
    done = [task for task in items if task.status == "Done"]
    overdue = [
        task
        for task in pending
        if task.due_date and task.due_date < today
    ]
    due_today = [task for task in pending if task.due_date == today]
    completed_yesterday = [
        task
        for task in done
        if task.created_at and task.created_at.date() >= yesterday
    ]
    load: dict[str, int] = defaultdict(int)
    for task in pending:
        name = task.assignee.full_name if task.assignee else "Unassigned"
        load[name] += 1
    overloaded = [name for name, count in load.items() if count >= 6]
    progress = int((len(done) / total) * 100) if total else 0
    return {
        "total": total,
        "pending": len(pending),
        "done": len(done),
        "overdue": len(overdue),
        "due_today": len(due_today),
        "completed_recently": len(completed_yesterday),
        "progress": progress,
        "load": dict(load),
        "overloaded": overloaded,
        "overdue_titles": [task.title for task in overdue[:8]],
        "pending_titles": [task.title for task in pending[:12]],
    }


def get_delayed_tasks(db: Session, company_id: str, project_id: str | None = None) -> str:
    stats = workspace_stats(db, company_id, project_id)
    titles = stats["overdue_titles"] or ["None"]
    return (
        f"{stats['overdue']} overdue tasks. "
        f"Examples: {', '.join(titles)}"
    )


def get_my_tasks(db: Session, company_id: str, user_id: str) -> str:
    items, total = list_tasks(
        db, company_id, assignee_id=user_id, limit=20, offset=0
    )
    open_items = [task for task in items if task.status != "Done"]
    lines = [
        f"- {task.title} ({task.status}, {task.priority})"
        for task in open_items[:10]
    ]
    return f"{len(open_items)} open tasks assigned to you:\n" + (
        "\n".join(lines) or "None"
    )


def get_project_status(db: Session, company_id: str, project_id: str | None) -> str:
    stats = workspace_stats(db, company_id, project_id)
    return (
        f"Progress {stats['progress']}%. {stats['pending']} pending, "
        f"{stats['done']} done, {stats['overdue']} overdue, "
        f"{stats['due_today']} due today."
    )


def chat(
    db: Session,
    company_id: str,
    user: User,
    message: str,
    history: list[dict],
    project_id: str | None,
) -> dict:
    history_text = "\n".join(
        f"{item.get('role', 'user')}: {item.get('content', '')}"
        for item in history[-8:]
    )
    decision = invoke_json(
        "You are TaskFlow AI assistant with tools. Return JSON: "
        '{"tool":"get_delayed_tasks"|"get_my_tasks"|"get_project_status"|null,'
        '"answer":"optional direct answer if no tool is needed"}. '
        "Use a tool when the question needs live workspace data.",
        f"History:\n{history_text}\n\nQuestion: {message}",
        temperature=0.1,
    )
    tool = decision.get("tool")
    tools_used = []
    tool_result = ""
    if tool == "get_delayed_tasks":
        tool_result = get_delayed_tasks(db, company_id, project_id)
        tools_used.append(tool)
    elif tool == "get_my_tasks":
        tool_result = get_my_tasks(db, company_id, user.id)
        tools_used.append(tool)
    elif tool == "get_project_status":
        tool_result = get_project_status(db, company_id, project_id)
        tools_used.append(tool)

    if not tools_used:
        return {
            "answer": decision.get("answer")
            or invoke_text(
                "You are TaskFlow AI, a concise project assistant.",
                message,
            ),
            "tools_used": [],
        }

    answer = invoke_text(
        "You are TaskFlow AI. Use the tool result to answer clearly. "
        "Do not invent tasks that are not in the tool result.",
        f"Question: {message}\n\nTool {tools_used[0]} result:\n{tool_result}",
    )
    return {"answer": answer, "tools_used": tools_used}


def daily_report(db: Session, company_id: str, project_id: str | None = None) -> dict:
    stats = workspace_stats(db, company_id, project_id)
    report = invoke_text(
        "Write a concise daily standup report from the stats. "
        "Cover completed work, delayed items, and overall progress. "
        "Use short paragraphs and bullets.",
        json.dumps(stats),
        temperature=0.3,
    )
    return {"report": report, "stats": stats}


def predict_risk(db: Session, company_id: str, project_id: str | None = None) -> dict:
    stats = workspace_stats(db, company_id, project_id)
    data = invoke_json(
        "You are a delivery risk analyst. Return JSON with "
        "assessment (string), risk_level (low|medium|high), "
        "recommendations (string array). Be concrete.",
        json.dumps(stats),
        temperature=0.2,
    )
    return {
        "assessment": data.get("assessment") or "",
        "risk_level": data.get("risk_level") or "medium",
        "recommendations": [str(item) for item in (data.get("recommendations") or [])],
        "stats": stats,
    }


def transcribe_audio(path: str) -> str:
    require_openai_key()
    try:
        from openai import OpenAI
    except ImportError as exc:
        raise service_unavailable("openai package is not installed") from exc

    client = OpenAI(api_key=extended_settings.openai_api_key)
    with open(path, "rb") as handle:
        result = client.audio.transcriptions.create(
            model=extended_settings.openai_whisper_model,
            file=handle,
        )
    return (getattr(result, "text", None) or str(result)).strip()


def meeting_summary_from_transcript(
    db: Session,
    company_id: str,
    actor: User,
    transcript: str,
    project_id: str | None,
    create_tasks: bool,
) -> dict:
    data = invoke_json(
        "Extract a meeting summary. Return JSON with summary (string), "
        "action_items (array of {title, owner, due_date, description}).",
        f"Transcript:\n{transcript}",
        temperature=0.2,
    )
    action_items = data.get("action_items") or []
    created_ids = []
    if create_tasks and project_id and action_items:
        for item in action_items:
            if not item.get("title"):
                continue
            due = None
            raw_due = item.get("due_date")
            if raw_due:
                try:
                    due = date.fromisoformat(str(raw_due)[:10])
                except ValueError:
                    due = None
            task = create_task(
                db,
                company_id,
                actor,
                title=str(item["title"]).strip(),
                description=str(item.get("description") or item.get("owner") or ""),
                project_id=project_id,
                board_id=None,
                column_id=None,
                status="Backlog",
                priority="Medium",
                due_date=due,
                assignee_id=None,
                assignee=item.get("owner"),
            )
            created_ids.append(task.id)
    return {
        "summary": data.get("summary") or "",
        "action_items": action_items,
        "created_task_ids": created_ids,
        "transcript": transcript[:4000],
    }


def extract_code_snippets(path: Path, original_name: str) -> tuple[str, str]:
    suffix = Path(original_name).suffix.lower()
    if suffix == ".zip":
        import zipfile

        chunks: list[str] = []
        with zipfile.ZipFile(path) as archive:
            names = [
                name
                for name in archive.namelist()
                if Path(name).suffix.lower() in ALLOWED_CODE_SUFFIXES
                and not name.endswith("/")
            ][:12]
            for name in names:
                try:
                    raw = archive.read(name)
                except Exception:
                    continue
                if len(raw) > 80_000:
                    continue
                text = raw.decode("utf-8", errors="ignore")
                chunks.append(f"// FILE: {name}\n{text[:4000]}")
        if not chunks:
            raise bad_request("No readable source files found in the zip")
        return "mixed", "\n\n".join(chunks)[:12000]

    if suffix not in ALLOWED_CODE_SUFFIXES:
        raise bad_request("Upload a source file or a .zip of source files")
    text = path.read_text(encoding="utf-8", errors="ignore")
    return suffix.lstrip("."), text[:12000]


def review_code(code: str, language: str | None, filename: str) -> dict:
    data = invoke_json(
        "You are a senior code reviewer. Return JSON with summary, "
        "issues (string array), suggestions (string array). "
        "Keep it scoped to the provided snippet.",
        f"Filename: {filename}\nLanguage: {language or 'unknown'}\n\n{code}",
        temperature=0.2,
    )
    return {
        "language": language,
        "summary": data.get("summary") or "",
        "issues": [str(item) for item in (data.get("issues") or [])],
        "suggestions": [str(item) for item in (data.get("suggestions") or [])],
    }


def generate_daily_reports_for_all_companies() -> dict:
    from app.db.session import SessionLocal

    db = SessionLocal()
    generated = 0
    try:
        companies = db.query(Company).all()
        for company in companies:
            result = daily_report(db, company.id, None)
            owners = (
                db.query(User)
                .filter(User.company_id == company.id)
                .limit(3)
                .all()
            )
            from app.services.email_service import send_email

            subject = f"Daily AI report — {company.name}"
            html = f"<pre style='font-family:Outfit,sans-serif'>{result['report']}</pre>"
            for owner in owners:
                if owner.email:
                    send_email(owner.email, subject, html)
            generated += 1
        return {"generated": generated}
    finally:
        db.close()
