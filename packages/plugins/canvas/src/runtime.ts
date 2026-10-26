import { type ContentManifest, escapeHtmlAttribute } from "@riebeckite/core";
import { CANVAS_NOTE_HREF } from "./render.js";

type CanvasRuntime = {
  resolve(manifest: ContentManifest): void;
};

const NOTE_LINK_PATTERN = new RegExp(
  `href="${CANVAS_NOTE_HREF}" data-canvas-note="([^"]*)"`,
  "g",
);

export function createCanvasRuntime(): CanvasRuntime {
  return {
    resolve(manifest) {
      for (const entry of manifest.entries) {
        if (typeof entry.html !== "string") continue;
        if (!entry.html.includes(CANVAS_NOTE_HREF)) continue;

        const html = finalizeCanvasNoteLinks(entry.html, manifest);
        if (html === entry.html) continue;

        entry.html = html;
      }
    },
  };
}

export function finalizeCanvasNoteLinks(
  html: string,
  manifest: ContentManifest,
): string {
  if (!html.includes(CANVAS_NOTE_HREF)) return html;
  return resolveNoteLinks(html, manifest);
}

function resolveNoteLinks(html: string, manifest: ContentManifest): string {
  return html.replace(NOTE_LINK_PATTERN, (_match, encoded: string) => {
    const slug = decodeSlug(encoded);
    const target = slug ? manifest.bySlug.get(slug) : undefined;
    const permalink = target?.publishing.routable
      ? target.permalink
      : undefined;
    return `href="${escapeHtmlAttribute(permalink ?? "#")}" data-canvas-note="${encoded}"`;
  });
}

function decodeSlug(encoded: string): string | null {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return null;
  }
}
