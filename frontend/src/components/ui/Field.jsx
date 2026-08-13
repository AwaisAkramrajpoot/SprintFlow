const fieldClass =
  "w-full rounded-xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] px-4 py-3 text-[0.95rem] text-white outline-none transition duration-200 placeholder:text-[var(--tf-faint)] focus:border-[var(--tf-border-strong)] focus:bg-[rgba(6,16,24,0.75)]";

export function Field({ label, children }) {
  return (
    <label className="block">
      {label ? (
        <span className="mb-2 block text-[0.8rem] font-medium tracking-[0.02em] text-[var(--tf-muted)]">
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
