import { Link } from "react-router-dom";

import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions, useWorkspaceQuery } from "../hooks/useTaskFlow";
import {
  formatDate,
  isDueToday,
  isOverdue,
  relativeDueLabel,
} from "../lib/taskflow";

function StatCard({ label, value, hint, tone = "sky" }) {
  return (
    <Card className="tf-hover-lift p-5">
      <p className="text-[0.85rem] text-[var(--tf-muted)]">{label}</p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="tf-display text-4xl font-bold text-[var(--tf-ink)]">{value}</p>
        <Badge tone={tone}>{hint}</Badge>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const {
    projects,
    activities,
    tasks,
    myTasks,
    currentUser,
    currentProject,
  } = useTaskFlow();
  const { openTask } = useTaskFlowActions();
  const workspaceQuery = useWorkspaceQuery();

  const dueToday = myTasks.filter((task) => isDueToday(task.dueDate));
  const overdue = myTasks.filter((task) => isOverdue(task.dueDate, task.status));
  const upcoming = [...myTasks]
    .filter((task) => task.status !== "Done")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Dashboard"
        title={`Welcome back, ${currentUser.name.split(" ")[0]}`}
        description="Track your assignments, deadlines, and recent team activity in one place."
        actions={[
          <Link
            key="projects"
            to="/app/projects"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--tf-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--tf-ink)] transition hover:bg-[var(--tf-accent-soft)]"
          >
            View projects
          </Link>,
          <Link
            key="board"
            to="/app/board"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--tf-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--tf-accent-ink)] transition hover:brightness-110"
          >
            Open board
          </Link>,
        ]}
      />

      {workspaceQuery.isFetching ? (
        <p className="text-sm text-[var(--tf-muted)]">Refreshing workspace…</p>
      ) : null}

      <div className="tf-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="My open tasks"
          value={myTasks.filter((task) => task.status !== "Done").length}
          hint="assigned to you"
        />
        <StatCard
          label="Active projects"
          value={projects.length}
          hint="company scope"
        />
        <StatCard
          label="Due today"
          value={dueToday.length}
          hint="priority sync"
          tone="warning"
        />
        <StatCard
          label="Overdue"
          value={overdue.length}
          hint="needs attention"
          tone="danger"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="tf-eyebrow">Recent activity</p>
              <h3 className="tf-title mt-2 text-xl">What changed recently</h3>
            </div>
            <Badge tone="muted">{tasks.length} tasks</Badge>
          </div>

          <div className="mt-5 space-y-3">
            {activities.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--tf-border)] bg-[var(--tf-bg-1)] p-4 transition hover:border-[var(--tf-border-strong)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--tf-ink)]">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--tf-muted)]">
                      {item.detail}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--tf-muted)]">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <p className="tf-eyebrow">My upcoming deadlines</p>
          <h3 className="tf-title mt-2 text-xl">Tasks that need attention</h3>
          <p className="mt-1 text-sm text-[var(--tf-muted)]">
            Focused on {currentProject?.name ?? "your projects"}
          </p>

          <div className="mt-5 space-y-3">
            {upcoming.length === 0 ? (
              <p className="text-sm text-[var(--tf-muted)]">
                No open tasks assigned to you.
              </p>
            ) : (
              upcoming.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task.id)}
                  className="tf-hover-lift w-full rounded-xl border border-[var(--tf-border)] bg-[var(--tf-bg-1)] p-4 text-left"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--tf-ink)]">{task.title}</p>
                    <Badge
                      tone={
                        isOverdue(task.dueDate, task.status)
                          ? "danger"
                          : task.priority === "Urgent"
                            ? "danger"
                            : "muted"
                      }
                    >
                      {relativeDueLabel(task.dueDate)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm text-[var(--tf-muted)]">
                    <span>{task.status}</span>
                    <span>{formatDate(task.dueDate)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export default DashboardPage;
