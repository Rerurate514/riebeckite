import type { ExcalidrawPayload, ExcalidrawScene } from "./types.js";

export function renderExcalidrawPlaceholder(input: {
  title: string;
  scene?: ExcalidrawScene;
  size?: { width?: number; height?: number };
  lazy?: boolean;
  error?: string;
}): string {
  const style = renderSizeStyle(input.size);
  const error = input.error
    ? `<p class="rr-excalidraw__error">${escapeHtml(input.error)}</p>`
    : "";
  const payload = input.scene ? renderPayloadScript(input.scene) : "";
  const state = input.error ? "error" : "pending";
  const lazy = input.lazy === false ? "false" : "true";

  return `<figure class="rr-excalidraw" data-excalidraw="${state}" data-excalidraw-lazy="${lazy}"${style}>
  <div class="rr-excalidraw__canvas" role="img" aria-label="${escapeHtmlAttribute(input.title)}"></div>
  ${error}
  ${payload}
</figure>`;
}

function renderPayloadScript(scene: ExcalidrawScene): string {
  const payload: ExcalidrawPayload = {
    elements: scene.elements,
    appState: scene.appState ?? {},
    files: scene.files ?? {},
  };
  return `<script type="application/json" class="rr-excalidraw__payload">${escapeScriptJson(JSON.stringify(payload))}</script>`;
}

function renderSizeStyle(
  size: { width?: number; height?: number } | undefined,
): string {
  if (!size?.width && !size?.height) return "";
  const declarations = [
    size.width ? `--rr-excalidraw-width:${size.width}px` : null,
    size.height ? `--rr-excalidraw-height:${size.height}px` : null,
  ].filter(Boolean);
  return ` style="${declarations.join(";")}"`;
}

function escapeScriptJson(value: string): string {
  return value
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}
