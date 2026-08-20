import { Link } from "react-router-dom";

import Badge from "../components/ui/Badge";
import PageShell from "../components/PageShell";

function HomePage() {
  return (
    <PageShell className="pb-12">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="tf-brand-mark h-11 w-11 text-sm">TF</div>
          <div>
            <p className="tf-display text-lg font-bold text-[var(--tf-ink)]">TaskFlow AI</p>
            <p className="text-xs font-medium text-[var(--tf-muted)]">Work, aligned</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--tf-muted)] transition hover:text-[var(--tf-ink)]"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-xl bg-[var(--tf-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(15,143,106,0.25)] transition hover:brightness-105"
          >
            Get started
          </Link>
        </div>
      </header>

      <section className="tf-hero-shine relative min-h-[78vh] overflow-hidden rounded-[2rem] border border-[var(--tf-border)] bg-white shadow-[var(--tf-shadow)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(15,143,106,0.16),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(12,22,18,0.05),transparent_48%)]" />
        <div className="absolute -right-16 top-10 h-72 w-72 rounded-[40%] bg-[rgba(15,143,106,0.12)] blur-2xl" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent" />

        <div className="relative grid min-h-[78vh] content-center gap-12 px-8 py-14 lg:grid-cols-[1.2fr_0.8fr] lg:px-14 lg:py-16">
          <div className="tf-stagger max-w-3xl">
            <Badge tone="sky">Project management, powered by AI</Badge>
            <p className="tf-display mt-6 text-[clamp(3rem,8vw,5.8rem)] font-extrabold leading-[0.92] text-[var(--tf-ink)]">
              TaskFlow
              <span className="block text-[var(--tf-accent)]">AI</span>
            </p>
            <h1 className="mt-6 max-w-2xl text-[clamp(1.2rem,2.2vw,1.65rem)] font-medium leading-snug text-[var(--tf-muted)]">
              Plan sprints, run live boards, and get answers from your company
              documents — in one workspace.
            </h1>
            <p className="mt-4 max-w-xl text-[1.05rem] leading-relaxed text-[var(--tf-muted)]">
              Secure access, role-based permissions, realtime collaboration, and an
              intelligent knowledge base that stays grounded in your files.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--tf-accent)] px-6 py-3.5 text-[0.98rem] font-bold text-white shadow-[0_12px_28px_rgba(15,143,106,0.28)] transition hover:brightness-105"
              >
                Start your workspace
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--tf-border)] bg-white px-6 py-3.5 text-[0.98rem] font-bold text-[var(--tf-ink)] transition hover:border-[var(--tf-border-strong)]"
              >
                Sign in
              </Link>
            </div>
          </div>

          <div className="tf-stagger grid gap-3 self-center">
            <div className="tf-panel-dark rounded-2xl p-6 shadow-[var(--tf-shadow)]">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[rgba(238,246,241,0.55)]">
                Knowledge assistant
              </p>
              <p className="tf-display mt-3 text-2xl font-bold text-white">
                Ask your company docs
              </p>
              <p className="mt-3 rounded-xl bg-white/10 px-4 py-3 text-sm text-[rgba(238,246,241,0.9)]">
                “What is our leave policy for new hires?”
              </p>
              <p className="mt-3 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-[rgba(238,246,241,0.85)]">
                New hires receive 14 days of annual leave after probation, with manager approval for extended requests.
              </p>
            </div>
            {[
              ["Live boards", "Move work across columns with your team in sync"],
              ["Smart search", "Find tasks in plain English, not just keywords"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--tf-border)] bg-[rgba(255,255,255,0.9)] p-5"
              >
                <p className="tf-display text-lg font-bold text-[var(--tf-ink)]">{title}</p>
                <p className="mt-1.5 text-sm text-[var(--tf-muted)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tf-stagger mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Secure workspaces", "Invite teammates with Owner, Admin, Manager, and Member roles."],
          ["Clear dashboards", "See deadlines, overdue work, and recent activity at a glance."],
          ["AI assistants", "Generate tasks, plan sprints, and draft daily reports faster."],
          ["Knowledge base", "Upload policies and handbooks — ask questions with source citations."],
        ].map(([title, text]) => (
          <div
            key={title}
            className="tf-hover-lift rounded-2xl border border-[var(--tf-border)] bg-white/90 p-6"
          >
            <Badge tone="sky">Included</Badge>
            <p className="tf-display mt-4 text-xl font-bold text-[var(--tf-ink)]">{title}</p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--tf-muted)]">{text}</p>
          </div>
        ))}
      </section>
    </PageShell>
  );
}

export default HomePage;
