import { Link } from "react-router-dom";

import useTaskFlow from "../hooks/useTaskFlow";
import Card from "./ui/Card";

function RequireAdmin({ children }) {
  const { canManageCompany, company } = useTaskFlow();

  if (!canManageCompany) {
    return (
      <Card className="mx-auto max-w-2xl p-8 text-center">
        <p className="tf-eyebrow">Restricted</p>
        <h2 className="tf-title mt-3 text-2xl">Admin access required</h2>
        <p className="mt-3 text-[var(--tf-muted)]">
          Company settings and member management are limited to Owner and Admin
          roles. Your current role is <strong>{company.role}</strong>.
        </p>
        <Link
          to="/app/dashboard"
          className="mt-6 inline-flex rounded-xl bg-[var(--tf-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--tf-accent-ink)]"
        >
          Back to dashboard
        </Link>
      </Card>
    );
  }

  return children;
}

export default RequireAdmin;
