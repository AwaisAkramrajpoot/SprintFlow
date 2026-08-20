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
          <Link to="/" className="mb-6 inline-flex items-center gap-3">
            <span className="tf-brand-mark h-10 w-10 text-xs">TF</span>
            <span className="tf-display text-lg font-bold text-[var(--tf-ink)]">TaskFlow AI</span>
          </Link>
          <p className="tf-eyebrow">Sign in</p>
          <h1 className="tf-title mt-4 text-[2.6rem] md:text-[3.2rem]">
            Welcome back
          </h1>
          <p className="mt-3 text-[1.02rem] text-[var(--tf-muted)]">
            Sign in to continue to your company workspace.
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
            <Link to="/register" className="font-semibold text-[var(--tf-accent)] hover:underline">
              Create a workspace
            </Link>
          </p>
        </Card>

        <div className="tf-panel-dark tf-hero-shine overflow-hidden rounded-[1.75rem] p-8 shadow-[var(--tf-shadow)] md:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-[rgba(238,246,241,0.55)]">
            Why teams pick TaskFlow
          </p>
          <p className="tf-display mt-4 text-3xl font-bold text-white md:text-4xl">
            Project clarity plus document-grounded AI
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ["Live boards", "Keep delivery moving with shared Kanban boards"],
              ["Knowledge answers", "Ask policies and handbooks with source citations"],
              ["Team permissions", "Owner, Admin, Manager, and Member access"],
              ["AI assistants", "Generate tasks, reports, and natural-language search"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-1.5 text-sm text-[rgba(238,246,241,0.7)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default LoginPage;
