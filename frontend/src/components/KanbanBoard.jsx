import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useMemo, useRef, useState } from "react";

import { boardStatuses, relativeDueLabel } from "../lib/taskflow";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import Badge from "./ui/Badge";

function buildColumnMap(tasks) {
  return boardStatuses.reduce((acc, status) => {
    acc[status] = tasks
      .filter((task) => task.status === status)
      .map((task) => String(task.id));
    return acc;
  }, {});
}

function CardBody({ task }) {
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.95rem] font-semibold text-[var(--tf-ink)]">{task.title}</p>
          <p className="mt-2 line-clamp-2 text-sm text-[var(--tf-muted)]">
            {task.description}
          </p>
        </div>
        <Badge tone={task.priority === "Urgent" ? "danger" : "sky"}>
          {task.priority}
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-[var(--tf-muted)]">
        <span>{task.assignee}</span>
        <span>{relativeDueLabel(task.dueDate)}</span>
      </div>

      <div className="mt-3 flex gap-3 text-[11px] uppercase tracking-[0.16em] text-[var(--tf-muted)]">
        <span>{(task.comments || []).length} comments</span>
        <span>{(task.attachments || []).length} files</span>
      </div>
    </>
  );
}

function TaskCard({ task, onOpen }) {
  const wasDragging = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: String(task.id),
    data: { type: "task", status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  useEffect(() => {
    if (isDragging) {
      wasDragging.current = true;
    }
  }, [isDragging]);

  return (
    <article
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => {
        if (wasDragging.current) {
          wasDragging.current = false;
          return;
        }
        onOpen(task.id);
      }}
      className={[
        "tf-kanban-card cursor-grab rounded-2xl border border-[var(--tf-border)] bg-white p-4 shadow-[var(--tf-shadow-soft)] active:cursor-grabbing",
        isDragging ? "tf-kanban-card--dragging" : "",
      ].join(" ")}
    >
      <CardBody task={task} />
    </article>
  );
}

function OverlayCard({ task }) {
  return (
    <article className="tf-kanban-card tf-kanban-card--dragging box-border h-full w-full cursor-grabbing rounded-2xl border border-[var(--tf-border-strong)] bg-white p-4 shadow-[var(--tf-shadow)] ring-1 ring-[var(--tf-border-strong)]">
      <CardBody task={task} />
    </article>
  );
}

function DroppableColumn({ id, children, title, count, isOver }) {
  const { setNodeRef } = useDroppable({
    id,
    data: { type: "column", status: id },
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "flex min-h-[420px] flex-col rounded-[1.5rem] border border-[var(--tf-border)] bg-[var(--tf-bg-1)]/80 p-4 transition duration-200",
        isOver ? "border-[var(--tf-border-strong)] bg-[var(--tf-accent-soft)]" : "",
      ].join(" ")}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="tf-eyebrow">{title}</h3>
          <p className="mt-1 text-sm text-[var(--tf-muted)]">{count} tasks</p>
        </div>
        <Badge tone="muted">{count}</Badge>
      </div>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
    </div>
  );
}

function KanbanBoard() {
  const { projectTasks, currentProject } = useTaskFlow();
  const { moveTask, openTask } = useTaskFlowActions();
  const [activeId, setActiveId] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);
  const [previewItems, setPreviewItems] = useState(null);
  const baseColumnItems = useMemo(
    () => buildColumnMap(projectTasks),
    [projectTasks]
  );
  const columnItems = previewItems ?? baseColumnItems;
  const columnItemsRef = useRef(columnItems);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    })
  );

  const taskMap = useMemo(
    () => new Map(projectTasks.map((task) => [String(task.id), task])),
    [projectTasks]
  );

  useEffect(() => {
    columnItemsRef.current = columnItems;
  }, [columnItems]);

  const activeTask = activeId ? taskMap.get(String(activeId)) : null;

  const findColumn = (id, items = columnItemsRef.current) => {
    if (id == null) return null;
    const key = String(id);
    if (boardStatuses.includes(key)) return key;
    for (const status of boardStatuses) {
      if (items[status]?.includes(key)) return status;
    }
    return taskMap.get(key)?.status ?? null;
  };

  const handleDragStart = ({ active }) => {
    setActiveId(String(active.id));
    setPreviewItems(baseColumnItems);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const activeKey = String(active.id);
    const overKey = String(over.id);
    const items = columnItemsRef.current;
    const activeColumn = findColumn(activeKey, items);
    const overColumn = findColumn(overKey, items);

    if (!activeColumn || !overColumn) return;
    setOverColumnId(overColumn);

    if (activeColumn === overColumn) {
      const list = items[activeColumn];
      const oldIndex = list.indexOf(activeKey);
      const newIndex = list.indexOf(overKey);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

      const next = {
        ...items,
        [activeColumn]: arrayMove(list, oldIndex, newIndex),
      };
      columnItemsRef.current = next;
      setPreviewItems(next);
      return;
    }

    const source = [...items[activeColumn]];
    const destination = [...items[overColumn]];
    const fromIndex = source.indexOf(activeKey);
    if (fromIndex < 0) return;

    source.splice(fromIndex, 1);

    if (boardStatuses.includes(overKey)) {
      destination.push(activeKey);
    } else {
      const toIndex = destination.indexOf(overKey);
      destination.splice(toIndex >= 0 ? toIndex : destination.length, 0, activeKey);
    }

    const next = {
      ...items,
      [activeColumn]: source,
      [overColumn]: destination,
    };
    columnItemsRef.current = next;
    setPreviewItems(next);
  };

  const handleDragEnd = ({ active }) => {
    const taskId = String(active.id);
    const destinationColumn = findColumn(taskId, columnItemsRef.current);
    const task = taskMap.get(taskId);

    setActiveId(null);
    setOverColumnId(null);

    if (destinationColumn && task && task.status !== destinationColumn) {
      void moveTask(task.id, destinationColumn);
      setPreviewItems(null);
      return;
    }

    setPreviewItems(null);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setOverColumnId(null);
    setPreviewItems(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="tf-eyebrow">Kanban board</p>
            <h2 className="tf-title mt-2 text-2xl md:text-[1.85rem]">
              {currentProject?.name ?? "No project selected"}
            </h2>
            <p className="mt-1 text-sm text-[var(--tf-muted)]">
              Drag a card to another column to update its status.
            </p>
          </div>
          <Badge tone="sky">{currentProject?.status ?? "—"}</Badge>
        </div>

        <div className="grid gap-4 xl:grid-cols-4">
          {boardStatuses.map((status) => (
            <DroppableColumn
              key={status}
              id={status}
              title={status}
              count={columnItems[status].length}
              isOver={overColumnId === status}
            >
              <SortableContext
                items={columnItems[status]}
                strategy={verticalListSortingStrategy}
              >
                {columnItems[status].map((taskId) => {
                  const task = taskMap.get(taskId);
                  if (!task) return null;
                  return (
                    <TaskCard
                      key={taskId}
                      task={{ ...task, status }}
                      onOpen={openTask}
                    />
                  );
                })}
              </SortableContext>

              {columnItems[status].length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-[var(--tf-border)] px-4 py-10 text-center text-sm text-[var(--tf-muted)]">
                  Drop tasks here
                </div>
              ) : null}
            </DroppableColumn>
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTask ? <OverlayCard task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

export default KanbanBoard;
