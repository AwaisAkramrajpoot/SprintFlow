const buttonStyles = {
  primary:
    "bg-[var(--tf-accent)] text-[var(--tf-accent-ink)] hover:brightness-105 active:scale-[0.98] shadow-[0_10px_24px_rgba(15,143,106,0.25)]",
  secondary:
    "border border-[var(--tf-border)] bg-white text-[var(--tf-ink)] hover:border-[var(--tf-border-strong)] hover:bg-[var(--tf-accent-soft)]",
  ghost: "text-[var(--tf-muted)] hover:bg-black/[0.04] hover:text-[var(--tf-ink)]",
  danger:
    "bg-[color-mix(in_srgb,var(--tf-danger)_12%,white)] text-[var(--tf-danger)] border border-[color-mix(in_srgb,var(--tf-danger)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--tf-danger)_18%,white)]",
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
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[0.925rem] font-semibold tracking-[-0.01em] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--tf-accent)]/35 disabled:cursor-not-allowed disabled:opacity-50",
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
