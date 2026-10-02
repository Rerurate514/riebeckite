import {
  type ContentManifest,
  type ContentManifestEntry,
  type Diagnostic,
  escapeHtml,
} from "@riebeckite/core";
import { resolveFlashcardsOptions } from "./options.js";
import { parseFlashcards } from "./parse.js";
import {
  createFlashcardsPlaceholderPattern,
  decodeFlashcardsSource,
  FLASHCARDS_ATTRIBUTE,
} from "./placeholder.js";
import { renderFlashcards } from "./render.js";
import type { FlashcardsOptions, ResolvedFlashcardsOptions } from "./types.js";

export type FlashcardsRuntime = {
  resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void;
};

export function createFlashcardsRuntime(
  options: FlashcardsOptions,
): FlashcardsRuntime {
  const resolved = resolveFlashcardsOptions(options);

  return {
    resolve(manifest, diagnostics) {
      for (const entry of manifest.entries) {
        if (!entry.html.includes(FLASHCARDS_ATTRIBUTE)) continue;

        const html = replacePlaceholders(entry, resolved, diagnostics);
        if (html === entry.html) continue;

        entry.html = html;
      }
    },
  };
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  options: ResolvedFlashcardsOptions,
  diagnostics: Diagnostic[],
): string {
  const pattern = createFlashcardsPlaceholderPattern();

  return entry.html.replace(pattern, (_match, encoded: string) => {
    let source: string;
    try {
      source = decodeFlashcardsSource(encoded);
    } catch (error) {
      return reportInvalid(
        entry,
        options,
        diagnostics,
        `could not be decoded (${formatError(error)})`,
        "",
      );
    }

    const parsed = parseFlashcards(source);
    if (parsed.ok === false) {
      return reportInvalid(entry, options, diagnostics, parsed.reason, source);
    }

    return renderFlashcards(parsed.cards, options);
  });
}

function reportInvalid(
  entry: ContentManifestEntry,
  options: ResolvedFlashcardsOptions,
  diagnostics: Diagnostic[],
  reason: string,
  source: string,
): string {
  const message = `Flashcards block in \`${entry.slug}\` ${reason}.`;
  diagnostics.push({
    code: "flashcards-invalid",
    severity: "error",
    pluginName: "flashcards",
    slug: entry.slug,
    message,
  });

  const className = escapeHtml(options.className);
  return `<pre class="${className} ${className}--invalid"><code>${escapeHtml(source)}</code></pre>`;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
