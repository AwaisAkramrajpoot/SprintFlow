from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class GenerateTasksRequest(BaseModel):
    description: str = Field(min_length=3, max_length=4000)
    project_id: str | None = None


class GeneratedTask(BaseModel):
    title: str
    description: str = ""
    group: str = "general"
    priority: str = "Medium"
    estimated_hours: float = 4
    subtasks: list[str] = []


class GenerateTasksResponse(BaseModel):
    summary: str = ""
    tasks: list[GeneratedTask] = []


class CommitGeneratedTasksRequest(BaseModel):
    project_id: str
    tasks: list[GeneratedTask]


class EstimateTaskRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    context: str | None = None


class EstimateTaskResponse(BaseModel):
    estimated_hours: float
    confidence: str = "medium"
    checklist: list[str] = []
    notes: str = ""


class GenerateDescriptionRequest(BaseModel):
    title: str = Field(min_length=2, max_length=255)
    context: str | None = None


class GenerateDescriptionResponse(BaseModel):
    description: str
    requirements: list[str] = []
    acceptance_criteria: list[str] = []


class SprintDeveloper(BaseModel):
    name: str
    hours: float = 40


class SprintPendingTask(BaseModel):
    title: str
    estimated_hours: float = 4
    priority: str = "Medium"


class PlanSprintRequest(BaseModel):
    developers: list[SprintDeveloper]
    tasks: list[SprintPendingTask] | None = None
    project_id: str | None = None
    sprint_hours: float = 40


class PlanSprintResponse(BaseModel):
    allocations: list[dict[str, Any]] = []
    unassigned: list[str] = []
    notes: str = ""


class SummarizeCommentsResponse(BaseModel):
    main_issue: str
    proposed_solution: str
    current_status: str
    summary: str = ""


class NlSearchRequest(BaseModel):
    query: str = Field(min_length=3, max_length=500)
    project_id: str | None = None


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    history: list[ChatMessage] = []
    project_id: str | None = None


class ChatResponse(BaseModel):
    answer: str
    tools_used: list[str] = []


class DailyReportRequest(BaseModel):
    project_id: str | None = None


class DailyReportResponse(BaseModel):
    report: str
    stats: dict[str, Any] = {}


class RiskRequest(BaseModel):
    project_id: str | None = None


class RiskResponse(BaseModel):
    assessment: str
    risk_level: str = "medium"
    stats: dict[str, Any] = {}
    recommendations: list[str] = []


class CodeReviewResponse(BaseModel):
    language: str | None = None
    summary: str
    suggestions: list[str] = []
    issues: list[str] = []


class MeetingJobResponse(BaseModel):
    job_id: str
    status: str
    result: dict[str, Any] | None = None


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    result: dict[str, Any] | None = None
    error: str | None = None
