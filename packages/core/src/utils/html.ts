export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}

/**
 * Escapes JSON so it can be embedded inside a `<script>` element (e.g. as
 * `application/ld+json` or `application/json`). `JSON.stringify` leaves `<`,
 * `>`, `&`, U+2028 and U+2029 untouched; inside a script tag `<` terminates
 * the element, which lets an attacker break out and inject markup or code.
 * Replacing them with the equivalent `\uXXXX` escapes keeps the JSON valid
 * while neutralizing the dangerous characters.
 */
export function escapeScriptJson(value: string): string {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
