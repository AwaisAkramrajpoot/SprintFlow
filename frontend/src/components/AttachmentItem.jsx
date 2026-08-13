import {
  attachmentLabel,
  formatAttachmentSize,
  getAttachmentUrl,
  isImageAttachment,
} from "../lib/attachments";

function FileIcon() {
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--tf-faint)]">
      FILE
    </div>
  );
}

function AttachmentItem({ attachment, onRemove }) {
  const url = getAttachmentUrl(attachment);
  const isImage = isImageAttachment(attachment);
  const label = attachmentLabel(attachment);
  const size = formatAttachmentSize(attachment.size_bytes ?? attachment.size);
  const meta = [size, attachment.uploadedBy, attachment.uploadedAt]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rounded-xl border border-[var(--tf-border)] bg-[rgba(6,16,24,0.55)] p-3">
      <div className="flex items-start gap-3">
        {isImage && url ? (
          <a href={url} target="_blank" rel="noreferrer" className="shrink-0">
            <img
              src={url}
              alt={label}
              className="h-20 w-20 rounded-xl border border-[var(--tf-border)] object-cover"
            />
          </a>
        ) : (
          <FileIcon />
        )}

        <div className="min-w-0 flex-1">
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[var(--tf-accent)] hover:underline"
            >
              {label}
            </a>
          ) : (
            <p className="text-sm font-medium text-white">{label}</p>
          )}
          <p className="mt-1 text-xs text-[var(--tf-faint)]">{meta}</p>
          {isImage && url ? (
            <p className="mt-1 text-xs text-[var(--tf-muted)]">Click image to open full size</p>
          ) : null}
        </div>

        {onRemove ? (
          <button
            type="button"
            onClick={() => onRemove(attachment.id)}
            className="shrink-0 text-xs text-[var(--tf-danger)] hover:brightness-125"
          >
            Remove
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default AttachmentItem;
