import { Link } from "react-router-dom";

import Badge from "../components/ui/Badge";
import Card from "../components/ui/Card";
import PageShell from "../components/PageShell";

function HomePage() {
  return (
    <PageShell className="pb-10">
      <section className="tf-hero-shine relative min-h-[78vh] overflow-hidden rounded-[2rem] border border-[var(--tf-border)] bg-[rgba(8,20,30,0.7)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(62,196,240,0.22),transparent_42%),radial-gradient(ellipse_at_bottom_right,rgba(20,90,120,0.25),transparent_45%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[rgba(6,16,24,0.9)] to-transparent" />

        <div className="relative grid min-h-[78vh] content-center gap-10 px-8 py-14 lg:grid-cols-[1.15fr_0.85fr] lg:px-14 lg:py-16">
          <div className="tf-stagger max-w-3xl">
            <p className="tf-display text-[clamp(2.8rem,7vw,5.4rem)] font-extrabold leading-[0.95] text-white">
              TaskFlow AI
            </p>
            <h1 className="mt-5 max-w-2xl text-[clamp(1.35rem,2.4vw,1.85rem)] font-medium leading-snug text-[var(--tf-text)]">
              Multi-tenant project management with calm clarity and live board
              energy.
            </h1>
            <p className="mt-4 max-w-xl text-[1.02rem] leading-relaxed text-[var(--tf-muted)]">
              Auth, dashboard, Kanban, tasks, search, notifications, and admin
              settings — a complete Phase 1 product shell ready for FastAPI.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/login"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--tf-accent)] px-5 py-3 text-[0.95rem] font-semibold text-[var(--tf-accent-ink)] transition duration-200 hover:brightness-110"
              >
                Launch workspace
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--tf-border)] bg-white/[0.04] px-5 py-3 text-[0.95rem] font-semibold text-white transition duration-200 hover:border-[var(--tf-border-strong)] hover:bg-white/[0.08]"
              >
                Create company
              </Link>
            </div>
          </div>

          <div className="tf-stagger grid gap-3 self-center">
            {[
              ["Boards", "Drag work across status columns"],
              ["RBAC", "Owner and Admin gated settings"],
              ["Search", "Find tasks across the company"],
            ].map(([title, text]) => (
              <div
                key={title}
                className="rounded-2xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] p-5 backdrop-blur-md"
              >
                <p className="tf-display text-lg font-bold text-white">{title}</p>
                <p className="mt-1.5 text-sm text-[var(--tf-muted)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="tf-stagger grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Auth screens",
            text: "Login and register with create or join company flows.",
          },
          {
            title: "Dashboard",
            text: "My tasks, overdue counts, and a live activity pulse.",
          },
          {
            title: "Kanban board",
            text: "dnd-kit motion with rich task detail overlays.",
          },
          {
            title: "Admin settings",
            text: "Company profile, invites, and role management.",
          },
        ].map((item) => (
          <Card key={item.title} className="tf-hover-lift">
            <Badge tone="sky">Phase 1</Badge>
            <p className="tf-display mt-4 text-xl font-bold text-white">
              {item.title}
            </p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-[var(--tf-muted)]">
              {item.text}
            </p>
          </Card>
        ))}
      </section>
    </PageShell>
  );
}

export default HomePage;
