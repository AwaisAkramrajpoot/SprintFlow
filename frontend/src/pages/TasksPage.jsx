import { useEffect, useMemo, useState } from "react";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, Select, TextArea, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions, useTasksQuery } from "../hooks/useTaskFlow";
import { formatAttachmentSize } from "../lib/attachments";
import { boardStatuses, formatDate, priorities } from "../lib/taskflow";

function formatFileSize(bytes) {
  return formatAttachmentSize(bytes);
}

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
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const filePreviews = useMemo(
    () =>
      selectedFiles.map((file) => ({
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      })),
    [selectedFiles]
  );

  useEffect(
    () => () => {
      filePreviews.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
    },
    [filePreviews]
  );

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

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setSelectedFiles((current) => [...current, ...files]);
    event.target.value = "";
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!formData.title.trim() || !currentProject || isCreating) return;

    setIsCreating(true);
    try {
      await createTask({
        projectId: currentProject.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        status: formData.status,
        priority: formData.priority,
        assignee: formData.assignee,
        dueDate: formData.dueDate || new Date().toISOString().slice(0, 10),
        files: selectedFiles,
      });

      setFormData({
        title: "",
        description: "",
        assignee: members[0]?.name ?? "",
        priority: "Medium",
        status: "Backlog",
        dueDate: "",
      });
      setSelectedFiles([]);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Tasks"
        title={`Tasks · ${currentProject?.name ?? "No project"}`}
        description="Filter by status, priority, or assignee. Open any task for comments, files, and ownership."
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
            <p className="mt-3 text-xs text-[var(--tf-muted)]">
              Syncing ({filteredTasks.length} results)…
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--tf-border)]">
            <table className="w-full min-w-[640px] text-left">
              <thead className="bg-[var(--tf-bg-1)] text-[0.72rem] font-bold uppercase tracking-[0.14em] text-[var(--tf-muted)]">
                <tr>
                  <th className="px-4 py-4 text-[var(--tf-ink)]">Task</th>
                  <th className="px-4 py-4 text-[var(--tf-ink)]">Status</th>
                  <th className="px-4 py-4 text-[var(--tf-ink)]">Priority</th>
                  <th className="px-4 py-4 text-[var(--tf-ink)]">Due</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <tr
                    key={task.id}
                    className="border-t border-[var(--tf-border)] bg-white transition hover:bg-[var(--tf-bg-1)]"
                  >
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => openTask(task.id)}
                        className="text-left"
                      >
                        <p className="font-semibold text-[var(--tf-ink)]">{task.title}</p>
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

            <Field label="Images & files">
              <div className="space-y-3">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--tf-border)] bg-[var(--tf-bg-1)] px-4 py-6 text-center transition hover:border-[var(--tf-border-strong)] hover:bg-[var(--tf-bg-1)]">
                  <span className="text-sm font-medium text-[var(--tf-ink)]">
                    Click to add images or files
                  </span>
                  <span className="mt-1 text-xs text-[var(--tf-muted)]">
                    PNG, JPG, PDF, DOC, TXT and more
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                {filePreviews.length > 0 ? (
                  <ul className="space-y-2">
                    {filePreviews.map(({ file, preview }, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 rounded-xl border border-[var(--tf-border)] bg-[var(--tf-bg-1)] p-3"
                      >
                        {preview ? (
                          <img
                            src={preview}
                            alt={file.name}
                            className="h-12 w-12 rounded-lg border border-[var(--tf-border)] object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[var(--tf-accent-soft)] text-xs text-[var(--tf-muted)]">
                            FILE
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[var(--tf-ink)]">{file.name}</p>
                          <p className="text-xs text-[var(--tf-muted)]">
                            {formatFileSize(file.size)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(index)}
                          className="rounded-lg px-2 py-1 text-xs text-[var(--tf-muted)] transition hover:bg-[var(--tf-accent-soft)] hover:text-[var(--tf-ink)]"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={isCreating}
            >
              {isCreating ? "Creating…" : "Create task"}
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

export default TasksPage;
