import Card from "../components/ui/Card";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import KanbanBoard from "../components/KanbanBoard";
import useBoardWebSocket from "../hooks/useBoardWebSocket";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import { Select } from "../components/ui/Field";

function BoardPage() {
  const { selectedProjectId, projects } = useTaskFlow();
  const { setSelectedProjectId } = useTaskFlowActions();

  useBoardWebSocket(selectedProjectId);

  return (
    <PageShell noAnimation>
      <SectionHeading
        eyebrow="Board"
        title="Kanban view with drag and drop"
        description="Move tasks between Backlog, In Progress, Review, and Done. Changes sync live across teammates on this board."
      />

      <Card className="p-5">
        <label className="block max-w-lg">
          <span className="mb-2 block text-[0.8rem] font-medium text-[var(--tf-muted)]">
            Current project
          </span>
          <Select
            value={selectedProjectId ?? ""}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
        </label>
      </Card>

      {projects.length ? (
        <KanbanBoard />
      ) : (
        <Card className="p-8 text-center text-[var(--tf-muted)]">
          Create a project to start using the board.
        </Card>
      )}
    </PageShell>
  );
}

export default BoardPage;
