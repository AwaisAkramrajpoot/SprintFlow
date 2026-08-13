import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import { useTaskFlowActions } from "../hooks/useTaskFlow";

function LoginPage() {
  const { signIn } = useTaskFlowActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const from = location.state?.from?.pathname || "/app/dashboard";

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.email.trim() || !formData.password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await signIn({
        email: formData.email.trim(),
        password: formData.password,
        mode: "login",
      });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="tf-stagger p-8 md:p-10">
          <p className="tf-eyebrow">Sign in</p>
          <h1 className="tf-title mt-4 text-[2.6rem] md:text-[3.1rem]">
            Welcome back
          </h1>
          <p className="mt-3 text-[1.02rem] text-[var(--tf-muted)]">
            Sign in with your TaskFlow account. JWT access and refresh tokens
            are issued by the FastAPI backend.
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <Field label="Email">
              <TextInput
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                placeholder="you@company.com"
              />
            </Field>

            <Field label="Password">
              <TextInput
                type="password"
                value={formData.password}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder="••••••••"
              />
            </Field>

            {error ? (
              <p className="text-sm text-[var(--tf-danger)]">{error}</p>
            ) : null}

            <Button type="submit" variant="primary" className="w-full py-3" disabled={submitting}>
              {submitting ? "Signing in…" : "Enter workspace"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-[var(--tf-muted)]">
            No account yet?{" "}
            <Link to="/register" className="text-[var(--tf-accent)] hover:underline">
              Create a workspace
            </Link>
          </p>

          <div className="mt-6 rounded-2xl border border-[var(--tf-border)] bg-white/[0.03] p-4 text-sm text-[var(--tf-muted)]">
            <p className="font-semibold text-white">Create an account first</p>
            <p className="mt-2">
              Register a company workspace, then invite teammates from Settings.
            </p>
          </div>
        </Card>

        <Card className="tf-hero-shine overflow-hidden p-8 md:p-10">
          <div className="relative rounded-2xl border border-[var(--tf-border)] bg-[radial-gradient(ellipse_at_top_left,rgba(62,196,240,0.2),transparent_55%),rgba(6,16,24,0.55)] p-6">
            <p className="tf-eyebrow">Product shell</p>
            <p className="tf-display mt-4 text-3xl font-bold text-white">
              Built for focused teams
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Dashboard", "Workload and deadlines at a glance"],
                ["Board", "Animated Kanban status flow"],
                ["Tasks", "Filters, search, and quick create"],
                ["Settings", "Admin RBAC and invites"],
              ].map(([title, text]) => (
                <div
                  key={title}
                  className="rounded-xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.45)] p-4"
                >
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-1.5 text-sm text-[var(--tf-muted)]">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export default LoginPage;
