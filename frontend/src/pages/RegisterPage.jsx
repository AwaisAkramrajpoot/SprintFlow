import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useState } from "react";

import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { Field, TextInput } from "../components/ui/Field";
import PageShell from "../components/PageShell";
import { useTaskFlowActions } from "../hooks/useTaskFlow";

function RegisterPage() {
  const { signIn } = useTaskFlowActions();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteFromLink = searchParams.get("invite") || "";
  const emailFromLink = searchParams.get("email") || "";
  const [mode, setMode] = useState(inviteFromLink ? "join" : "create");
  const [formData, setFormData] = useState({
    name: "",
    email: emailFromLink,
    password: "",
    company: "",
    inviteToken: inviteFromLink,
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.password.trim() ||
      (mode === "create" && !formData.company.trim()) ||
      (mode === "join" && !formData.inviteToken.trim())
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await signIn({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        companyName: formData.company.trim(),
        inviteToken: formData.inviteToken.trim(),
        role: mode === "create" ? "Owner" : "Member",
        mode: mode === "create" ? "create" : "join",
      });
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Unable to create account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageShell>
      <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl items-center gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="tf-stagger p-8 md:p-10">
          <p className="tf-eyebrow">Create workspace</p>
          <h1 className="tf-title mt-4 text-[2.4rem] md:text-[3rem]">
            Start your company or join a team
          </h1>
          <p className="mt-3 text-[1.02rem] text-[var(--tf-muted)]">
            Create as Owner, or join an existing company as Member.
          </p>

          <div className="mt-6 flex gap-2 rounded-xl border border-[var(--tf-border)] bg-white/[0.03] p-1.5">
            {[
              ["create", "Create company"],
              ["join", "Join company"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={[
                  "flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition duration-200",
                  mode === value
                    ? "bg-[var(--tf-accent)] text-[var(--tf-accent-ink)]"
                    : "text-[var(--tf-muted)] hover:bg-white/[0.04] hover:text-white",
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <TextInput
                  value={formData.name}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Email">
                <TextInput
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      email: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

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
              />
            </Field>

          <Field
            label={mode === "create" ? "Company name" : "Invite token"}
          >
            <TextInput
              value={mode === "create" ? formData.company : formData.inviteToken}
              onChange={(event) =>
                setFormData((current) =>
                  mode === "create"
                    ? { ...current, company: event.target.value }
                    : { ...current, inviteToken: event.target.value }
                )
              }
              placeholder={
                mode === "create" ? "Northstar Studio" : "Paste invite token from email"
              }
            />
          </Field>

            {error ? (
              <p className="text-sm text-[var(--tf-danger)]">{error}</p>
            ) : null}

            <Button type="submit" variant="primary" className="w-full py-3" disabled={submitting}>
              {submitting
                ? "Please wait…"
                : mode === "create"
                  ? "Create workspace"
                  : "Join workspace"}
            </Button>
          </form>

          <p className="mt-6 text-sm text-[var(--tf-muted)]">
            Already have an account?{" "}
            <Link to="/login" className="text-[var(--tf-accent)] hover:underline">
              Sign in
            </Link>
          </p>
        </Card>

        <Card className="p-8 md:p-10">
          <p className="tf-eyebrow">Onboarding</p>
          <div className="tf-stagger mt-5 space-y-3">
            {[
              "Owner, Admin, Manager, Member roles",
              "Company invite handling",
              "JWT login handoff next",
              "Workspace creation confirmation",
            ].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[var(--tf-border)] bg-white/[0.03] p-4 text-sm text-[var(--tf-muted)]"
              >
                {item}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

export default RegisterPage;
