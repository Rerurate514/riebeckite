/** Escapes text for safe inclusion in HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapes a value for safe inclusion in a quoted HTML attribute. */
export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
