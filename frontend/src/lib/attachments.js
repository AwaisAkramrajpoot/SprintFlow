import { getBackendOrigin } from "../api/client";

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|svg|bmp|avif)$/i;

export function isImageAttachment(attachment) {
  if (!attachment) return false;
  const type = attachment.content_type || attachment.contentType || attachment.type || "";
  if (typeof type === "string" && type.startsWith("image/")) return true;
  const name = attachment.name || attachment.original_name || "";
  return IMAGE_EXTENSIONS.test(name);
}

export function getAttachmentUrl(attachment) {
  if (!attachment) return null;
  if (attachment.url) return attachment.url;
  if (attachment.previewUrl) return attachment.previewUrl;
  if (attachment.file_url) {
    if (attachment.file_url.startsWith("http")) return attachment.file_url;
    return `${getBackendOrigin()}${attachment.file_url}`;
  }
  return null;
}

export function formatAttachmentSize(size) {
  if (size == null || size === "") return "—";
  if (typeof size === "string") return size;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function attachmentLabel(attachment) {
  return attachment?.name || attachment?.original_name || "Attachment";
}
