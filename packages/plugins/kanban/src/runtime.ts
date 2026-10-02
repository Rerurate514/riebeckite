import type { ContentManifest, ContentManifestEntry } from "@riebeckite/core";
import { isKanbanNote, parseKanban, stripFrontmatter } from "./parse.js";
import {
  createKanbanPlaceholderPattern,
  decodeKanbanSource,
  KANBAN_ATTRIBUTE,
} from "./placeholder.js";
import {
  createKanbanLinkResolver,
  type KanbanLinkResolver,
  renderKanban,
} from "./render.js";
import type { ResolvedKanbanOptions } from "./types.js";

export type KanbanRuntime = {
  track(slug: string, markdown: string): void;
  resolve(manifest: ContentManifest): void;
};

export function createKanbanRuntime(
  options: ResolvedKanbanOptions,
): KanbanRuntime {
  const markdownBySlug = new Map<string, string>();

  return {
    track(slug, markdown) {
      markdownBySlug.set(slug, markdown);
    },
    resolve(manifest) {
      const resolveLink = createKanbanLinkResolver(manifest);

      for (const entry of manifest.entries) {
        const markdown = markdownBySlug.get(entry.slug);
        if (
          options.autoDetect &&
          markdown !== undefined &&
          isKanbanNote(entry.frontmatter)
        ) {
          const parsed = parseKanban(stripFrontmatter(markdown), options);
          applyHtml(entry, resolveLink, options, "note", parsed);
          continue;
        }

        if (!entry.html.includes(KANBAN_ATTRIBUTE)) continue;
        const html = replacePlaceholders(entry, options, resolveLink);
        if (html !== entry.html) {
          entry.html = html;
        }
      }
    },
  };
}

function applyHtml(
  entry: ContentManifestEntry,
  resolveLink: KanbanLinkResolver,
  options: ResolvedKanbanOptions,
  source: "block" | "note",
  parsed: ReturnType<typeof parseKanban>,
): void {
  const html = renderKanban(parsed, options, resolveLink, source);
  if (html === entry.html) return;
  entry.html = html;
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  options: ResolvedKanbanOptions,
  resolveLink: KanbanLinkResolver,
): string {
  const pattern = createKanbanPlaceholderPattern();
  return entry.html.replace(pattern, (_match, encoded: string) => {
    const parsed = parseKanban(decodeKanbanSource(encoded), options);
    return renderKanban(parsed, options, resolveLink, "block");
  });
}
