import { useState } from "react";
import { Link } from "react-router-dom";

import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, TextArea, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import SectionHeading from "../components/SectionHeading";
import useTaskFlow, { useTaskFlowActions } from "../hooks/useTaskFlow";
import { formatDate } from "../lib/taskflow";

function ProjectsPage() {
  const { projects, selectedProjectId, tasks } = useTaskFlow();
  const { createProject, setSelectedProjectId, deleteProject, updateProject } =
    useTaskFlowActions();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    dueDate: "",
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.name.trim()) return;

    await createProject({
      name: formData.name.trim(),
      description: formData.description.trim(),
      dueDate: formData.dueDate || undefined,
    });
    setFormData({ name: "", description: "", dueDate: "" });
  };

  return (
    <PageShell>
      <SectionHeading
        eyebrow="Projects"
        title="Company project portfolio"
        description="Create, select, and manage projects. Selecting a project drives the board and tasks views."
      />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="tf-stagger grid gap-4 md:grid-cols-2">
          {projects.map((project) => {
            const count = tasks.filter(
              (task) => task.projectId === project.id
            ).length;

            return (
              <div
                key={project.id}
                className={[
                  "rounded-2xl border p-5 transition duration-200",
                  selectedProjectId === project.id
                    ? "border-[var(--tf-border-strong)] bg-[var(--tf-accent-soft)]"
                    : "border-[var(--tf-border)] bg-white/[0.03]",
                ].join(" ")}
              >
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="tf-display text-lg font-bold text-white">
                        {project.name}
                      </p>
                      <p className="mt-2 text-sm text-[var(--tf-muted)]">
                        {project.description}
                      </p>
                    </div>
                    <Badge
                      tone={project.status === "At Risk" ? "warning" : "sky"}
                    >
                      {project.status}
                    </Badge>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm text-[var(--tf-muted)]">
                    <div>
                      <p className="text-[var(--tf-faint)]">Tasks</p>
                      <p className="mt-1 font-semibold text-white">{count}</p>
                    </div>
                    <div>
                      <p className="text-[var(--tf-faint)]">Due</p>
                      <p className="mt-1 font-semibold text-white">
                        {formatDate(project.dueDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--tf-faint)]">Lead</p>
                      <p className="mt-1 font-semibold text-white">
                        {project.lead}
                      </p>
                    </div>
                  </div>
                </button>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    to="/app/board"
                    onClick={() => setSelectedProjectId(project.id)}
                    className="inline-flex rounded-xl border border-[var(--tf-border)] bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white hover:bg-white/[0.08]"
                  >
                    Open board
                  </Link>
                  <Button
                    variant="secondary"
                    className="!px-3 !py-2 !text-xs"
                    onClick={() =>
                      updateProject(project.id, {
                        status:
                          project.status === "At Risk" ? "On Track" : "At Risk",
                      })
                    }
                  >
                    Toggle risk
                  </Button>
                  <Button
                    variant="danger"
                    className="!px-3 !py-2 !text-xs"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Delete project "${project.name}" and its tasks?`
                        )
                      ) {
                        deleteProject(project.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <Card className="p-6">
          <p className="tf-eyebrow">New project</p>
          <h3 className="tf-title mt-2 text-xl">Create a project</h3>
          <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
            <Field label="Project name">
              <TextInput
                value={formData.name}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Launch website redesign"
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
                placeholder="What is this project delivering?"
              />
            </Field>
            <Field label="Target due date">
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
            <Button variant="primary" type="submit" className="w-full">
              Add project
            </Button>
          </form>
        </Card>
      </div>
    </PageShell>
  );
}

export default ProjectsPage;
