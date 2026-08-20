function Modal({ title, children, onClose }) {
  return (
    <div className="tf-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-[rgba(12,22,18,0.45)] p-4 backdrop-blur-md">
      <div className="tf-modal-panel tf-surface-strong flex max-h-[90vh] w-full max-w-5xl flex-col p-6 md:p-7">
        <div className="flex items-center justify-between gap-4 border-b border-[var(--tf-border)] pb-4">
          <div>
            <p className="tf-eyebrow">Task detail</p>
            <h3 className="tf-title mt-2 text-[1.65rem] md:text-[1.85rem]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-[var(--tf-border)] px-3.5 py-2 text-sm text-[var(--tf-muted)] transition hover:border-[var(--tf-border-strong)] hover:text-[var(--tf-ink)]"
          >
            Close
          </button>
        </div>
        <div className="overflow-auto pt-5">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
