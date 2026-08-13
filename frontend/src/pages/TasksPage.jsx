import { useMemo, useState } from "react";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, Select, TextArea, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions, useTasksQuery } from "../hooks/useTaskFlow";
import { boardStatuses, formatDate, priorities } from "../lib/taskflow";

function TasksPage() {
  const { projectTasks, currentProject, members } = useTaskFlow();
  const { openTask, createTask } = useTaskFlowActions();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [priority, setPriority] = useState("All");
  const [assignee, setAssignee] = useState("All");
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: members[0]?.name ?? "",
    priority: "Medium",
    status: "Backlog",
    dueDate: "",
  });

  const filters = {
    projectId: currentProject?.id,
    status,
    priority,
    assignee,
    q: query,
  };

  const tasksQuery = useTasksQuery(filters);

  const filteredTasks = useMemo(() => {
    return projectTasks.filter((task) => {
      const matchesQuery =
        !query ||
        task.title.toLowerCase().includes(query.toLowerCase()) ||
        task.description.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "All" || task.status === status;
      const matchesPriority = priority === "All" || task.priority === priority;
      const matchesAssignee = assignee === "All" || task.assignee === assignee;
      return matchesQuery && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [projectTasks, query, status, priority, assignee]);

  const handleCreateTask = (event) => {
    event.preventDefault();
    if (!formData.title.trim() || !currentProject) return;

    createTask({
      projectId: currentProject.id,
      title: formData.title.trim(),
      description: formData.description.trim(),
      status: formData.status,
      priority: formData.priority,
      assignee: formData.assignee,
      dueDate: formData.dueDate || new Date().toISOString().slice(0, 10),
    });

    setFormData({
      title: "",
      description: "",
      assignee: members[0]?.name ?? "",
      priority: "Medium",
      status: "Backlog",
      dueDate: "",
    });
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Tasks"
        title={`Tasks · ${currentProject?.name ?? "No project"}`}
        description="Search, filter by status/priority/assignee, and create work items. Task detail opens with comments, attachments, and assignee controls."
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="p-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks"
            />
            <Select value={status} onChange={(event) => setStatus(event.target.value)}>
              {["All", ...boardStatuses].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
            >
              {["All", ...priorities].map((option) => (
                <option key={option}>{option}</option>
              ))}
            </Select>
            <Select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option>All</option>
              {members.map((member) => (
                <option key={member.id}>{member.name}</option>
              ))}
            </Select>
          </div>

          {tasksQuery.isFetching ? (
            <p className="mt-3 text-xs text-[var(--tf-faint)]">
              Syncing ({filteredTasks.length} results)…
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--tf-border)]">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-white/[0.03] text-[0.7rem] uppercase tracking-[0.22em] text-[var(--tf-faint)]">
                <tr>
                  <th className="px-4 py-4">Task</th>
                  <th className="px-4 py-4">Status</th>
                  <th className="px-4 py-4">Priority</th>
                  <th className="px-4 py-4">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-[var(--tf-border)] bg-[rgba(6,16,24,0.35)] transition hover:bg-white/[0.03]"
                  >
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openTask(task.id)}
                        className="text-left"
                      >
                        <p className="font-semibold text-white">{task.title}</p>
                        <p className="mt-1 text-sm text-[var(--tf-muted)]">
                          {task.assignee} · {(task.comments || []).length} comments
                        </p>
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone="muted">{task.status}</Badge>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={task.priority === "Urgent" ? "danger" : "sky"}
                      >
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-[var(--tf-muted)]">
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-8 text-center text-sm text-[var(--tf-muted)]"
                    >
                      No tasks match these filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <p className="tf-eyebrow">Add task</p>
          <h3 className="tf-title mt-2 text-xl">Create a new task</h3>
          <form className="mt-5 space-y-4" onSubmit={handleCreateTask}>
            <Field label="Title">
              <TextInput
                value={formData.title}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Task title"
              />
            </Field>
            <Field label="Description">
              <TextArea
                rows={4}
                value={formData.description}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Requirements and acceptance criteria"
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Assignee">
                <Select
                  value={formData.assignee}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      assignee: event.target.value,
                    }))
                  }
                >
                  {members.map((member) => (
                    <option key={member.id}>{member.name}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Priority">
                <Select
                  value={formData.priority}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      priority: event.target.value,
                    }))
                  }
                >
                  {priorities.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select
                  value={formData.status}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      status: event.target.value,
                    }))
                  }
                >
                  {boardStatuses.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Due date">
                <TextInput
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Create task
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

export default TasksPage;
