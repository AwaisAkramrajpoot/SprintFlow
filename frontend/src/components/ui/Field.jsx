const fieldClass =
  "w-full rounded-xl border border-[var(--tf-border)] bg-white px-4 py-3 text-[0.95rem] font-medium text-[var(--tf-ink)] outline-none transition duration-200 placeholder:text-[#6b7d73] focus:border-[var(--tf-border-strong)] focus:bg-white focus:shadow-[0_0_0_4px_rgba(12,125,92,0.12)]";

export function Field({ label, children }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-[0.82rem] font-bold tracking-[0.02em] text-[var(--tf-muted)]">
          {label}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function TextInput({ className = "", ...props }) {
  return <input className={[fieldClass, className].join(" ")} {...props} />;
}

export function TextArea({ className = "", ...props }) {
  return <textarea className={[fieldClass, className].join(" ")} {...props} />;
}

export function Select({ className = "", children, ...props }) {
  return (
    <select className={[fieldClass, className].join(" ")} {...props}>
      {children}
    </select>
  );
}
