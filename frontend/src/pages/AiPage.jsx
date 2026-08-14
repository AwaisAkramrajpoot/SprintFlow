import { useMemo, useState } from "react";

import { USE_MOCK_API } from "../api/client";
import { taskflowApi } from "../api/taskflowApi";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, Select, TextArea, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { hydrateWorkspace } from "../hooks/useTaskFlow";

const TABS = [
  { id: "generate", label: "Generate tasks" },
  { id: "estimate", label: "Estimate" },
  { id: "description", label: "Description" },
  { id: "sprint", label: "Sprint plan" },
  { id: "meeting", label: "Meeting" },
  { id: "report", label: "Daily report" },
  { id: "review", label: "Code review" },
  { id: "risk", label: "Risk" },
];

function AiPage() {
  const { projects, currentProject, members, projectTasks } = useTaskFlow();
  const [tab, setTab] = useState("generate");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [projectId, setProjectId] = useState(currentProject?.id ?? "");

  const [brief, setBrief] = useState("Build an e-commerce website with payments and admin dashboard");
  const [generated, setGenerated] = useState(null);

  const [estimateTitle, setEstimateTitle] = useState("Need Login API");
  const [estimate, setEstimate] = useState(null);

  const [descTitle, setDescTitle] = useState("Payment Module");
  const [description, setDescription] = useState(null);

  const [sprintHours, setSprintHours] = useState("40");
  const [sprint, setSprint] = useState(null);

  const [meetingFile, setMeetingFile] = useState(null);
  const [createFromMeeting, setCreateFromMeeting] = useState(true);
  const [meeting, setMeeting] = useState(null);

  const [report, setReport] = useState(null);
  const [reviewFile, setReviewFile] = useState(null);
  const [review, setReview] = useState(null);
  const [risk, setRisk] = useState(null);

  const developers = useMemo(
    () =>
      members.map((member) => ({
        name: member.name,
        hours: Number(sprintHours) || 40,
      })),
    [members, sprintHours]
  );

  const run = async (action) => {
    if (USE_MOCK_API) {
      setError("AI features need the live API. Set VITE_USE_MOCK_API=false.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message || "AI request failed");
    } finally {
      setBusy(false);
    }
  };

  const pollJob = async (jobId) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const status = await taskflowApi.getAiJob(jobId);
      if (status.status === "success") return status.result;
      if (status.status === "failed") {
        throw new Error(status.error || "Meeting job failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Meeting summary is still running. Try again shortly.");
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Phase 2"
        title="TaskFlow AI workspace"
        description="Generate tasks, estimate work, plan sprints, transcribe meetings, review code, and predict delivery risk. RAG is not included yet."
      />

      <Card className="p-4">
        <Field label="Project context">
          <Select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <div className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={[
              "rounded-xl px-4 py-2 text-sm font-semibold",
              tab === item.id
                ? "bg-[var(--tf-accent)] text-[var(--tf-accent-ink)]"
                : "border border-[var(--tf-border)] text-[var(--tf-muted)]",
            ].join(" ")}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? (
        <Card className="p-4 text-sm text-[var(--tf-danger)]">{error}</Card>
      ) : null}

      {tab === "generate" ? (
        <Card className="p-6">
          <Field label="Project description">
            <TextArea rows={5} value={brief} onChange={(event) => setBrief(event.target.value)} />
          </Field>
          <div className="mt-4 flex gap-3">
            <Button
              variant="primary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const data = await taskflowApi.generateTasks({
                    description: brief,
                    project_id: projectId,
                  });
                  setGenerated(data);
                })
              }
            >
              {busy ? "Generating…" : "Generate tasks"}
            </Button>
            {generated?.tasks?.length ? (
              <Button
                disabled={busy || !projectId}
                onClick={() =>
                  run(async () => {
                    await taskflowApi.commitGeneratedTasks({
                      project_id: projectId,
                      tasks: generated.tasks,
                    });
                    await hydrateWorkspace();
                    setError("");
                    setGenerated({
                      ...generated,
                      committed: generated.tasks.length,
                    });
                  })
                }
              >
                Create {generated.tasks.length} tasks
              </Button>
            ) : null}
          </div>
          {generated?.summary ? (
            <p className="mt-4 text-sm text-[var(--tf-muted)]">{generated.summary}</p>
          ) : null}
          <div className="mt-4 grid gap-3">
            {(generated?.tasks || []).map((task) => (
              <div key={task.title} className="rounded-xl border border-[var(--tf-border)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-white">{task.title}</p>
                  <Badge tone="muted">{task.group}</Badge>
                  <Badge>{task.priority}</Badge>
                  <Badge tone="sky">{task.estimated_hours}h</Badge>
                </div>
                <p className="mt-2 text-sm text-[var(--tf-muted)]">{task.description}</p>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "estimate" ? (
        <Card className="p-6">
          <Field label="Task title">
            <TextInput
              value={estimateTitle}
              onChange={(event) => setEstimateTitle(event.target.value)}
            />
          </Field>
          <Button
            className="mt-4"
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setEstimate(await taskflowApi.estimateTask({ title: estimateTitle }));
              })
            }
          >
            {busy ? "Estimating…" : "Estimate hours"}
          </Button>
          {estimate ? (
            <div className="mt-4 space-y-2 text-sm text-[var(--tf-muted)]">
              <p>
                <strong className="text-white">{estimate.estimated_hours} hours</strong> ·{" "}
                {estimate.confidence} confidence
              </p>
              <p>{estimate.notes}</p>
              <ul className="list-disc pl-5">
                {(estimate.checklist || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "description" ? (
        <Card className="p-6">
          <Field label="Short title">
            <TextInput value={descTitle} onChange={(event) => setDescTitle(event.target.value)} />
          </Field>
          <Button
            className="mt-4"
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setDescription(await taskflowApi.generateDescription({ title: descTitle }));
              })
            }
          >
            {busy ? "Writing…" : "Generate description"}
          </Button>
          {description ? (
            <div className="mt-4 space-y-3 text-sm text-[var(--tf-muted)]">
              <p className="whitespace-pre-wrap">{description.description}</p>
              <p className="font-semibold text-white">Requirements</p>
              <ul className="list-disc pl-5">
                {(description.requirements || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="font-semibold text-white">Acceptance criteria</p>
              <ul className="list-disc pl-5">
                {(description.acceptance_criteria || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "sprint" ? (
        <Card className="p-6">
          <Field label="Hours per developer">
            <TextInput
              type="number"
              value={sprintHours}
              onChange={(event) => setSprintHours(event.target.value)}
            />
          </Field>
          <p className="mt-3 text-sm text-[var(--tf-faint)]">
            Uses {members.length} teammates and {projectTasks.filter((task) => task.status !== "Done").length} pending tasks.
          </p>
          <Button
            className="mt-4"
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setSprint(
                  await taskflowApi.planSprint({
                    developers,
                    project_id: projectId,
                    sprint_hours: Number(sprintHours) || 40,
                  })
                );
              })
            }
          >
            {busy ? "Planning…" : "Plan sprint"}
          </Button>
          {sprint ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-[var(--tf-muted)]">{sprint.notes}</p>
              {(sprint.allocations || []).map((item) => (
                <div key={item.developer} className="rounded-xl border border-[var(--tf-border)] p-4">
                  <p className="font-semibold text-white">
                    {item.developer} · {item.total_hours ?? "—"}h
                  </p>
                  <ul className="mt-2 list-disc pl-5 text-sm text-[var(--tf-muted)]">
                    {(item.tasks || []).map((task) => (
                      <li key={task.title || task}>
                        {task.title || task} {task.estimated_hours ? `(${task.estimated_hours}h)` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "meeting" ? (
        <Card className="p-6">
          <Field label="Audio file">
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm"
              onChange={(event) => setMeetingFile(event.target.files?.[0] || null)}
            />
          </Field>
          <label className="mt-4 flex items-center gap-2 text-sm text-[var(--tf-muted)]">
            <input
              type="checkbox"
              checked={createFromMeeting}
              onChange={(event) => setCreateFromMeeting(event.target.checked)}
            />
            Create tasks from action items
          </label>
          <Button
            className="mt-4"
            variant="primary"
            disabled={busy || !meetingFile}
            onClick={() =>
              run(async () => {
                const queued = await taskflowApi.uploadMeeting(meetingFile, {
                  projectId,
                  createTasks: createFromMeeting,
                });
                const result = queued.result || (await pollJob(queued.job_id));
                setMeeting(result);
                if (result?.created_task_ids?.length) await hydrateWorkspace();
              })
            }
          >
            {busy ? "Transcribing…" : "Summarize meeting"}
          </Button>
          {meeting ? (
            <div className="mt-4 space-y-2 text-sm text-[var(--tf-muted)]">
              <p className="whitespace-pre-wrap">{meeting.summary}</p>
              {(meeting.action_items || []).map((item) => (
                <p key={item.title}>
                  • {item.title} {item.owner ? `— ${item.owner}` : ""}
                </p>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "report" ? (
        <Card className="p-6">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setReport(await taskflowApi.dailyReport({ project_id: projectId || null }));
              })
            }
          >
            {busy ? "Writing report…" : "Generate daily report"}
          </Button>
          {report ? (
            <pre className="mt-4 whitespace-pre-wrap text-sm text-[var(--tf-muted)]">
              {report.report}
            </pre>
          ) : null}
        </Card>
      ) : null}

      {tab === "review" ? (
        <Card className="p-6">
          <Field label="Source file or zip">
            <input
              type="file"
              accept=".py,.js,.jsx,.ts,.tsx,.java,.go,.zip,.txt,.md"
              onChange={(event) => setReviewFile(event.target.files?.[0] || null)}
            />
          </Field>
          <Button
            className="mt-4"
            variant="primary"
            disabled={busy || !reviewFile}
            onClick={() =>
              run(async () => {
                setReview(await taskflowApi.reviewCode(reviewFile));
              })
            }
          >
            {busy ? "Reviewing…" : "Review code"}
          </Button>
          {review ? (
            <div className="mt-4 space-y-2 text-sm text-[var(--tf-muted)]">
              <p>{review.summary}</p>
              {(review.issues || []).map((item) => (
                <p key={item}>Issue: {item}</p>
              ))}
              {(review.suggestions || []).map((item) => (
                <p key={item}>Suggestion: {item}</p>
              ))}
            </div>
          ) : null}
        </Card>
      ) : null}

      {tab === "risk" ? (
        <Card className="p-6">
          <Button
            variant="primary"
            disabled={busy}
            onClick={() =>
              run(async () => {
                setRisk(await taskflowApi.predictRisk({ project_id: projectId || null }));
              })
            }
          >
            {busy ? "Analyzing…" : "Predict risk"}
          </Button>
          {risk ? (
            <div className="mt-4 space-y-2 text-sm text-[var(--tf-muted)]">
              <Badge tone={risk.risk_level === "high" ? "danger" : "sky"}>
                {risk.risk_level}
              </Badge>
              <p>{risk.assessment}</p>
              <ul className="list-disc pl-5">
                {(risk.recommendations || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Card>
      ) : null}
    </PageShell>
  );
}

export default AiPage;
