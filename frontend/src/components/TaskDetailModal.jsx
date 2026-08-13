import { useState } from "react";

import { getBackendOrigin, USE_MOCK_API } from "../api/client";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import {
  boardStatuses,
  formatDate,
  formatDateTime,
  priorities,
  relativeDueLabel,
} from "../lib/taskflow";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import { Field, Select, TextArea, TextInput } from "./ui/Field";
import Modal from "./ui/Modal";

function TaskDetailModal() {
  const { activeTask, members, currentUser, canManageCompany } = useTaskFlow();
  const {
    closeTask,
    updateTask,
    deleteTask,
    addComment,
    deleteComment,
    addAttachment,
    removeAttachment,
    toggleChecklistItem,
    addChecklistItem,
  } = useTaskFlowActions();

  const [comment, setComment] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  if (!activeTask) {
    return null;
  }

  const checklist = activeTask.checklist || [];
  const comments = activeTask.comments || [];
  const attachments = activeTask.attachments || [];
  const doneCount = checklist.filter((item) => item.done).length;

  const handleAddComment = (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    addComment(activeTask.id, comment.trim());
    setComment("");
  };

  const handleAddChecklist = (event) => {
    event.preventDefault();
    if (!checklistText.trim()) return;
    addChecklistItem(activeTask.id, checklistText.trim());
    setChecklistText("");
  };

  const handleAddAttachment = (event) => {
    event.preventDefault();
    const fileInput = event.currentTarget.elements.namedItem("attachmentFile");
    const file = fileInput?.files?.[0];
    if (file) {
      addAttachment(activeTask.id, { file, name: file.name });
      event.currentTarget.reset();
      setAttachmentName("");
      return;
    }
    if (!attachmentName.trim()) return;
    addAttachment(activeTask.id, {
      name: attachmentName.trim(),
      size: "128 KB",
    });
    setAttachmentName("");
  };

  return (
    <Modal title={activeTask.title} onClose={closeTask}>
      <div className="max-h-[75vh] overflow-auto pr-1">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={activeTask.priority === "Urgent" ? "danger" : "sky"}>
                {activeTask.priority}
              </Badge>
              <Badge tone="muted">{activeTask.status}</Badge>
              <Badge tone="muted">{activeTask.assignee}</Badge>
            </div>

            <Field label="Description">
              <TextArea
                rows={4}
                value={activeTask.description}
                onChange={(event) =>
                  updateTask(activeTask.id, { description: event.target.value })
                }
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4">
                <p className="tf-eyebrow">Due</p>
                <p className="mt-2 font-semibold text-white">
                  {formatDate(activeTask.dueDate)}
                </p>
                <p className="text-sm text-[var(--tf-muted)]">
                  {relativeDueLabel(activeTask.dueDate)}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4">
                <p className="tf-eyebrow">Comments</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {comments.length}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4">
                <p className="tf-eyebrow">Attachments</p>
                <p className="mt-2 text-2xl font-semibold text-white">
                  {attachments.length}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Comments</p>
              <div className="mt-4 space-y-3">
                {comments.length === 0 ? (
                  <p className="text-sm text-[var(--tf-muted)]">No comments yet.</p>
                ) : (
                  comments.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {item.author}
                          </p>
                          <p className="mt-1 text-sm text-[var(--tf-muted)]">
                            {item.content}
                          </p>
                          <p className="mt-2 text-xs text-[var(--tf-faint)]">
                            {formatDateTime(item.createdAt)}
                          </p>
                        </div>
                        {item.userId === currentUser.id || canManageCompany ? (
                          <button
                            type="button"
                            onClick={() => deleteComment(activeTask.id, item.id)}
                            className="text-xs text-[var(--tf-danger)] hover:brightness-125"
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form className="mt-4 flex gap-2" onSubmit={handleAddComment}>
                <TextInput
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add a comment"
                />
                <Button type="submit" variant="primary">
                  Post
                </Button>
              </form>
            </div>

            <div className="rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4">
              <p className="text-sm font-semibold text-white">Attachments</p>
              <div className="mt-4 space-y-2">
                {attachments.length === 0 ? (
                  <p className="text-sm text-[var(--tf-muted)]">No files attached.</p>
                ) : (
                  attachments.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {file.file_url && !USE_MOCK_API ? (
                            <a
                              href={`${getBackendOrigin()}${file.file_url}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--tf-accent)] hover:underline"
                            >
                              {file.name}
                            </a>
                          ) : (
                            file.name
                          )}
                        </p>
                        <p className="text-xs text-[var(--tf-faint)]">
                          {file.size} · {file.uploadedBy} · {file.uploadedAt}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          removeAttachment(activeTask.id, file.id)
                        }
                        className="text-xs text-[var(--tf-danger)] hover:brightness-125"
                      >
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
              <form className="mt-4 space-y-2" onSubmit={handleAddAttachment}>
                <input
                  name="attachmentFile"
                  type="file"
                  className="w-full text-sm text-[var(--tf-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--tf-accent)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[var(--tf-accent-ink)]"
                />
                <div className="flex gap-2">
                  <TextInput
                    value={attachmentName}
                    onChange={(event) => setAttachmentName(event.target.value)}
                    placeholder="Or attach a named note"
                  />
                  <Button type="submit" variant="secondary">
                    Attach
                  </Button>
                </div>
              </form>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="space-y-3 rounded-2xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] p-4">
              <Field label="Status">
                <Select
                  value={activeTask.status}
                  onChange={(event) =>
                    updateTask(activeTask.id, { status: event.target.value })
                  }
                >
                  {boardStatuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Priority">
                <Select
                  value={activeTask.priority}
                  onChange={(event) =>
                    updateTask(activeTask.id, { priority: event.target.value })
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Assignee">
                <Select
                  value={activeTask.assignee}
                  onChange={(event) =>
                    updateTask(activeTask.id, { assignee: event.target.value })
                  }
                >
                  {members.map((member) => (
                    <option key={member.id}>{member.name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Due date">
                <TextInput
                  type="date"
                  value={activeTask.dueDate}
                  onChange={(event) =>
                    updateTask(activeTask.id, { dueDate: event.target.value })
                  }
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">Checklist</p>
                <Badge tone="muted">
                  {doneCount}/{checklist.length}
                </Badge>
              </div>
              <ul className="mt-3 space-y-2">
                {checklist.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-[var(--tf-border)] bg-white/[0.03] px-3 py-2 text-sm text-[var(--tf-muted)]">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={() =>
                          toggleChecklistItem(activeTask.id, item.id)
                        }
                        className="size-4 accent-[var(--tf-accent)]"
                      />
                      <span className={item.done ? "line-through opacity-60" : ""}>
                        {item.text}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <form className="mt-3 flex gap-2" onSubmit={handleAddChecklist}>
                <TextInput
                  value={checklistText}
                  onChange={(event) => setChecklistText(event.target.value)}
                  placeholder="Add checklist item"
                />
                <Button type="submit" variant="secondary">
                  Add
                </Button>
              </form>
            </div>

            <div className="flex gap-3">
              <Button
                variant="primary"
                className="flex-1"
                onClick={() => {
                  updateTask(activeTask.id, { status: "Done" });
                  closeTask();
                }}
              >
                Mark done
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => {
                  deleteTask(activeTask.id);
                }}
              >
                Delete
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </Modal>
  );
}

export default TaskDetailModal;
