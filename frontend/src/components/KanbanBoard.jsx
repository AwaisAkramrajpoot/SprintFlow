import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";

import { boardStatuses, relativeDueLabel } from "../lib/taskflow";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import Badge from "./ui/Badge";
import Card from "./ui/Card";

function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: task.id,
      data: { type: "task", status: task.status },
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task.id)}
      className={[
        "tf-kanban-card cursor-grab rounded-2xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.75)] p-4",
        isDragging ? "opacity-40" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.95rem] font-semibold text-white">{task.title}</p>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--tf-muted)]">
            {task.description}
          </p>
        </div>
        <Badge tone={task.priority === "Urgent" ? "danger" : "sky"}>
          {task.priority}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--tf-faint)]">
        <span>{task.assignee}</span>
        <span>{relativeDueLabel(task.dueDate)}</span>
      </div>

      <div className="mt-3 flex gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--tf-faint)]">
        <span>{(task.comments || []).length} comments</span>
        <span>{(task.attachments || []).length} files</span>
      </div>
    </article>
  );
}

function DroppableColumn({ id, children, title, count }) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: "column", status: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "rounded-[1.5rem] border border-[var(--tf-border)] bg-white/[0.03] p-4 transition duration-200",
        isOver ? "border-[var(--tf-border-strong)] bg-[var(--tf-accent-soft)]" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="tf-eyebrow">{title}</h3>
          <p className="mt-1 text-sm text-[var(--tf-faint)]">{count} tasks</p>
        </div>
        <Badge tone="muted">{count}</Badge>
      </div>
      <div className="min-h-24 space-y-3">{children}</div>
    </div>
  );
}

function KanbanBoard() {
  const { projectTasks, currentProject } = useTaskFlow();
  const { moveTask, openTask } = useTaskFlowActions();
  const [activeTaskId, setActiveTaskId] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const tasksByStatus = boardStatuses.reduce((acc, status) => {
    acc[status] = projectTasks.filter((task) => task.status === status);
    return acc;
  }, {});

  const activeTask = activeTaskId
    ? projectTasks.find((task) => task.id === activeTaskId)
    : null;

  const resolveStatus = (over) => {
    if (!over) return null;
    if (boardStatuses.includes(over.id)) return over.id;
    if (over.data.current?.status) return over.data.current.status;
    const task = projectTasks.find((item) => item.id === over.id);
    return task?.status ?? null;
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveTaskId(active.id)}
      onDragEnd={({ active, over }) => {
        setActiveTaskId(null);
        const destinationStatus = resolveStatus(over);
        if (destinationStatus) {
          moveTask(active.id, destinationStatus);
        }
      }}
      onDragCancel={() => setActiveTaskId(null)}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="tf-eyebrow">Kanban board</p>
            <h2 className="tf-title mt-2 text-2xl md:text-[1.85rem]">
              {currentProject?.name ?? "No project selected"}
            </h2>
          </div>
          <Badge tone="sky">{currentProject?.status ?? "—"}</Badge>
        </div>

        <div className="tf-stagger grid gap-4 xl:grid-cols-4">
          {boardStatuses.map((status) => (
            <SortableContext
              key={status}
              items={tasksByStatus[status].map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              <DroppableColumn
                id={status}
                title={status}
                count={tasksByStatus[status].length}
              >
                {tasksByStatus[status].map((task) => (
                  <TaskCard key={task.id} task={task} onOpen={openTask} />
                ))}
              </DroppableColumn>
            </SortableContext>
          ))}
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="w-[320px] border-[var(--tf-border-strong)]">
            <p className="text-sm font-semibold text-white">{activeTask.title}</p>
            <p className="mt-2 text-sm text-[var(--tf-muted)]">
              {activeTask.description}
            </p>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
