import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";

export function renderExcalidrawPage(input: {
  title: string;
  svg?: string;
  size?: { width?: number; height?: number };
  error?: string;
}): string {
  const heading = input.title
    ? `<h1 class="rr-excalidraw-page__title">${escapeHtml(input.title)}</h1>`
    : "";
  return `<main class="rr-excalidraw-page">${heading}${renderExcalidrawFigure(
    input,
  )}</main>`;
}

export function renderExcalidrawFigure(input: {
  title: string;
  svg?: string;
  size?: { width?: number; height?: number };
  error?: string;
}): string {
  const style = renderSizeStyle(input.size);
  const error = input.error
    ? `<p class="rr-excalidraw__error">${escapeHtml(input.error)}</p>`
    : "";
  const state = input.error ? "error" : "ready";
  const label = input.svg
    ? ` role="img" aria-label="${escapeHtmlAttribute(input.title)}"`
    : "";

  return `<figure class="rr-excalidraw" data-excalidraw="${state}"${style}>
  <div class="rr-excalidraw__canvas"${label}>${input.svg ?? ""}</div>
  ${error}
</figure>`;
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
