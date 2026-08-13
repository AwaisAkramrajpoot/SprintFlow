import { useState } from "react";

import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import { TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, {
  useTaskFlowActions,
  useSearchQuery,
} from "../hooks/useTaskFlow";
import { formatDate } from "../lib/taskflow";

function SearchPage() {
  const { projects } = useTaskFlow();
  const { openTask } = useTaskFlowActions();
  const [query, setQuery] = useState("");
  const searchQuery = useSearchQuery(query);

  const results = searchQuery.data ?? [];

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Search"
        title="Full-text task search"
        description="Search across title and description for every company task."
      />

      <Card className="p-5">
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder='Try "invoice", "dashboard", or "permissions"'
          autoFocus
          className="text-[1.05rem]"
        />
        <p className="mt-3 text-sm text-[var(--tf-faint)]">
          {query.trim()
            ? searchQuery.isFetching
              ? "Searching…"
              : `${results.length} result${results.length === 1 ? "" : "s"}`
            : "Type to search across all company tasks."}
        </p>
      </Card>

      <div className="tf-stagger grid gap-3">
        {results.map((task) => {
          const project = projects.find((item) => item.id === task.projectId);
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => openTask(task.id)}
              className="tf-hover-lift rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-5 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="tf-display text-lg font-bold text-white">
                  {task.title}
                </p>
                <Badge tone="muted">{task.status}</Badge>
                <Badge tone={task.priority === "Urgent" ? "danger" : "sky"}>
                  {task.priority}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-[var(--tf-muted)]">
                {task.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--tf-faint)]">
                <span>{project?.name ?? "Unknown project"}</span>
                <span>{task.assignee}</span>
                <span>{formatDate(task.dueDate)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}

export default SearchPage;
