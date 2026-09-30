import {
  type ContentManifest,
  escapeHtmlAttribute,
  type PostContent,
} from "@riebeckite/core";
import { CANVAS_NOTE_HREF } from "./render.js";

export type CanvasRuntime = {
  track(slug: string, content: PostContent): void;
  resolve(manifest: ContentManifest): void;
};

const NOTE_LINK_PATTERN = new RegExp(
  `href="${CANVAS_NOTE_HREF}" data-canvas-note="([^"]*)"`,
  "g",
);

export function createCanvasRuntime(): CanvasRuntime {
  const tracked = new Map<string, PostContent>();

  return {
    track(slug, content) {
      tracked.set(slug, content);
    },
    resolve(manifest) {
      for (const entry of manifest.entries) {
        if (typeof entry.html !== "string") continue;
        if (!entry.html.includes(CANVAS_NOTE_HREF)) continue;

        const html = resolveNoteLinks(entry.html, manifest);
        if (html === entry.html) continue;

        entry.html = html;
        const content = tracked.get(entry.slug);
        if (content) content.html = html;
      }
    },
  };
}

function resolveNoteLinks(html: string, manifest: ContentManifest): string {
  return html.replace(NOTE_LINK_PATTERN, (_match, encoded: string) => {
    const slug = decodeSlug(encoded);
    const permalink = slug ? manifest.bySlug.get(slug)?.permalink : undefined;
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
