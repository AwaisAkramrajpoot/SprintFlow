from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.dependencies import ANY_MEMBER, MANAGER_PLUS, AuthContext
from app.core.exceptions import bad_request
from app.core.extended_settings import extended_settings
from app.db.session import get_db
from app.schemas.ai import (
    ChatRequest,
    ChatResponse,
    CodeReviewResponse,
    CommitGeneratedTasksRequest,
    DailyReportRequest,
    DailyReportResponse,
    EstimateTaskRequest,
    EstimateTaskResponse,
    GenerateDescriptionRequest,
    GenerateDescriptionResponse,
    GenerateTasksRequest,
    GenerateTasksResponse,
    JobStatusResponse,
    MeetingJobResponse,
    NlSearchRequest,
    PlanSprintRequest,
    PlanSprintResponse,
    RiskRequest,
    RiskResponse,
    SummarizeCommentsResponse,
)
from app.services.ai import ai_service
from app.services.serializers import task_to_dict
from app.workers.dispatch import enqueue_meeting_summary

router = APIRouter(prefix="/ai", tags=["ai"])

AUDIO_TYPES = {
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "video/webm",
}


@router.post("/generate-tasks", response_model=GenerateTasksResponse)
def generate_tasks(
    payload: GenerateTasksRequest,
    ctx: AuthContext = Depends(MANAGER_PLUS),
):
    return GenerateTasksResponse(**ai_service.generate_tasks(payload.description))


@router.post("/commit-tasks")
def commit_tasks(
    payload: CommitGeneratedTasksRequest,
    ctx: AuthContext = Depends(MANAGER_PLUS),
    db: Session = Depends(get_db),
):
    created = ai_service.commit_generated_tasks(
        db,
        ctx.company.id,
        ctx.user,
        payload.project_id,
        [item.model_dump() for item in payload.tasks],
    )
    return {"items": [task_to_dict(item) for item in created], "total": len(created)}


@router.post("/estimate-task", response_model=EstimateTaskResponse)
def estimate_task(
    payload: EstimateTaskRequest,
    ctx: AuthContext = Depends(ANY_MEMBER),
):
    return EstimateTaskResponse(
        **ai_service.estimate_task(payload.title, payload.context)
    )


@router.post("/generate-description", response_model=GenerateDescriptionResponse)
def generate_description(
    payload: GenerateDescriptionRequest,
    ctx: AuthContext = Depends(ANY_MEMBER),
):
    return GenerateDescriptionResponse(
        **ai_service.generate_description(payload.title, payload.context)
    )


@router.post("/plan-sprint", response_model=PlanSprintResponse)
def plan_sprint(
    payload: PlanSprintRequest,
    ctx: AuthContext = Depends(MANAGER_PLUS),
    db: Session = Depends(get_db),
):
    result = ai_service.plan_sprint(
        db,
        ctx.company.id,
        [item.model_dump() for item in payload.developers],
        [item.model_dump() for item in payload.tasks] if payload.tasks else None,
        payload.project_id,
        payload.sprint_hours,
    )
    return PlanSprintResponse(**result)


@router.post("/meeting-summary", response_model=MeetingJobResponse)
def meeting_summary(
    file: UploadFile = File(...),
    project_id: str | None = Form(default=None),
    create_tasks: bool = Form(default=False),
    ctx: AuthContext = Depends(MANAGER_PLUS),
):
    content_type = (file.content_type or "").lower()
    suffix = Path(file.filename or "meeting.mp3").suffix.lower() or ".mp3"
    if content_type and not content_type.startswith("audio/") and content_type not in AUDIO_TYPES:
        if suffix not in {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"}:
            raise bad_request("Upload an audio file (mp3, wav, m4a, webm)")

    data = file.file.read()
    if not data:
        raise bad_request("Empty audio file")
    if len(data) > extended_settings.max_upload_bytes:
        raise bad_request("Audio exceeds the upload limit")

    upload_dir = Path(extended_settings.upload_dir) / "meetings"
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored = upload_dir / f"{uuid4()}{suffix}"
    stored.write_bytes(data)

    job_id = enqueue_meeting_summary(
        path=str(stored),
        company_id=ctx.company.id,
        user_id=ctx.user.id,
        project_id=project_id,
        create_tasks=create_tasks,
    )
    return MeetingJobResponse(job_id=job_id, status="queued", result=None)


@router.get("/jobs/{job_id}", response_model=JobStatusResponse)
def get_ai_job(
    job_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
):
    from app.workers.dispatch import get_job_status

    payload = get_job_status(job_id)
    return JobStatusResponse(job_id=job_id, **payload)


@router.post("/summarize-comments/{task_id}", response_model=SummarizeCommentsResponse)
def summarize_comments(
    task_id: str,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return SummarizeCommentsResponse(
        **ai_service.summarize_comments(db, ctx.company.id, task_id)
    )


@router.post("/nl-search")
def nl_search(
    payload: NlSearchRequest,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    return ai_service.nl_search(
        db, ctx.company.id, payload.query, payload.project_id
    )


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    ctx: AuthContext = Depends(ANY_MEMBER),
    db: Session = Depends(get_db),
):
    result = ai_service.chat(
        db,
        ctx.company.id,
        ctx.user,
        payload.message,
        [item.model_dump() for item in payload.history],
        payload.project_id,
    )
    return ChatResponse(**result)


@router.post("/daily-report", response_model=DailyReportResponse)
def daily_report(
    payload: DailyReportRequest,
    ctx: AuthContext = Depends(MANAGER_PLUS),
    db: Session = Depends(get_db),
):
    return DailyReportResponse(
        **ai_service.daily_report(db, ctx.company.id, payload.project_id)
    )


@router.post("/review-code", response_model=CodeReviewResponse)
def review_code(
    file: UploadFile = File(...),
    ctx: AuthContext = Depends(ANY_MEMBER),
):
    suffix = Path(file.filename or "snippet.txt").suffix.lower()
    data = file.file.read()
    if not data:
        raise bad_request("Empty file")
    if len(data) > extended_settings.max_upload_bytes:
        raise bad_request("File exceeds the upload limit")

    upload_dir = Path(extended_settings.upload_dir) / "reviews"
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored = upload_dir / f"{uuid4()}{suffix or '.txt'}"
    stored.write_bytes(data)
    language, code = ai_service.extract_code_snippets(stored, file.filename or stored.name)
    return CodeReviewResponse(
        **ai_service.review_code(code, language, file.filename or stored.name)
    )


@router.post("/predict-risk", response_model=RiskResponse)
def predict_risk(
    payload: RiskRequest,
    ctx: AuthContext = Depends(MANAGER_PLUS),
    db: Session = Depends(get_db),
):
    return RiskResponse(**ai_service.predict_risk(db, ctx.company.id, payload.project_id))
