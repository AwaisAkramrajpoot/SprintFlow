import { Link } from "react-router-dom";

import Card from "../components/ui/Card";
import PageShell from "../components/PageShell";

function NotFoundPage() {
  return (
    <div className="tf-app-shell px-5 py-6">
      <PageShell>
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-3xl items-center">
          <Card className="w-full p-10 text-center">
            <p className="tf-eyebrow">404</p>
            <h1 className="tf-title mt-4 text-4xl md:text-5xl">
              That page does not exist
            </h1>
            <p className="mt-3 text-[var(--tf-muted)]">
              The route you opened is outside the TaskFlow frontend shell.
            </p>
            <div className="mt-8 flex justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-[var(--tf-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--tf-accent-ink)] transition hover:brightness-110"
              >
                Go home
              </Link>
              <Link
                to="/app/dashboard"
                className="inline-flex items-center justify-center rounded-xl border border-[var(--tf-border)] bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
              >
                Open dashboard
              </Link>
            </div>
          </Card>
        </div>
      </PageShell>
    </div>
  );
}

export default NotFoundPage;
