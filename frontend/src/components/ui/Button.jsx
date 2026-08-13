const buttonStyles = {
  primary:
    "bg-[var(--tf-accent)] text-[var(--tf-accent-ink)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "border border-[var(--tf-border)] bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-[var(--tf-border-strong)]",
  ghost: "text-[var(--tf-muted)] hover:bg-white/[0.05] hover:text-white",
  danger:
    "bg-[color-mix(in_srgb,var(--tf-danger)_18%,transparent)] text-[var(--tf-danger)] border border-[color-mix(in_srgb,var(--tf-danger)_35%,transparent)] hover:bg-[color-mix(in_srgb,var(--tf-danger)_28%,transparent)]",
};

function Button({
  children,
  variant = "secondary",
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.925rem] font-semibold tracking-[-0.01em] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-accent)]/40 disabled:cursor-not-allowed disabled:opacity-50",
        buttonStyles[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
