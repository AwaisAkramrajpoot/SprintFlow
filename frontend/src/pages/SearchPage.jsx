import { useState } from "react";

import { USE_MOCK_API } from "../api/client";
import { taskflowApi } from "../api/taskflowApi";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
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
  const { projects, currentProject } = useTaskFlow();
  const { openTask } = useTaskFlowActions();
  const [query, setQuery] = useState("");
  const [nlMode, setNlMode] = useState(false);
  const [nlBusy, setNlBusy] = useState(false);
  const [nlError, setNlError] = useState("");
  const [nlResult, setNlResult] = useState(null);
  const searchQuery = useSearchQuery(query);

  const results = nlMode ? nlResult?.items || [] : searchQuery.data ?? [];

  const runNlSearch = async (event) => {
    event.preventDefault();
    if (!query.trim() || USE_MOCK_API) return;
    setNlBusy(true);
    setNlError("");
    try {
      const data = await taskflowApi.nlSearch({
        query: query.trim(),
        project_id: currentProject?.id,
      });
      setNlResult(data);
    } catch (err) {
      setNlError(err.message || "NL search failed");
    } finally {
      setNlBusy(false);
    }
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Search"
        title="Full-text and natural-language search"
        description="Keyword search across titles, or ask in plain English: “high priority tasks assigned to Awais due this week”."
      />

      <Card className="p-5">
        <form onSubmit={nlMode ? runNlSearch : (event) => event.preventDefault()}>
          <TextInput
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              nlMode
                ? 'Show me high priority tasks due this week'
                : 'Try "invoice", "dashboard", or "permissions"'
            }
            autoFocus
            className="text-[1.05rem]"
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-[var(--tf-muted)]">
              <input
                type="checkbox"
                checked={nlMode}
                onChange={(event) => {
                  setNlMode(event.target.checked);
                  setNlResult(null);
                }}
              />
              Natural language (AI)
            </label>
            {nlMode ? (
              <Button type="submit" variant="primary" disabled={nlBusy}>
                {nlBusy ? "Searching…" : "Ask AI"}
              </Button>
            ) : null}
          </div>
        </form>
        <p className="mt-3 text-sm text-[var(--tf-faint)]">
          {nlError ||
            (nlMode
              ? nlResult
                ? `${results.length} AI-filtered result${results.length === 1 ? "" : "s"}`
                : "Ask a question, then click Ask AI."
              : query.trim()
                ? searchQuery.isFetching
                  ? "Searching…"
                  : `${results.length} result${results.length === 1 ? "" : "s"}`
                : "Type to search across all company tasks.")}
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
                <span>{formatDate(task.dueDate || task.due_date)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </PageShell>
  );
}

export default SearchPage;
