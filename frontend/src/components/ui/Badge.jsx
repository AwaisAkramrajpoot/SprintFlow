const badgeStyles = {
  success:
    "bg-[color-mix(in_srgb,var(--tf-success)_16%,transparent)] text-[var(--tf-success)] border-[color-mix(in_srgb,var(--tf-success)_30%,transparent)]",
  warning:
    "bg-[color-mix(in_srgb,var(--tf-warning)_16%,transparent)] text-[var(--tf-warning)] border-[color-mix(in_srgb,var(--tf-warning)_30%,transparent)]",
  danger:
    "bg-[color-mix(in_srgb,var(--tf-danger)_16%,transparent)] text-[var(--tf-danger)] border-[color-mix(in_srgb,var(--tf-danger)_30%,transparent)]",
  muted: "bg-white/[0.06] text-[var(--tf-muted)] border-white/10",
  sky: "bg-[var(--tf-accent-soft)] text-[var(--tf-accent)] border-[color-mix(in_srgb,var(--tf-accent)_30%,transparent)]",
};

function Badge({ children, tone = "muted", className = "" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-lg border px-2.5 py-1 text-[0.7rem] font-semibold tracking-[0.04em]",
        badgeStyles[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default Badge;
