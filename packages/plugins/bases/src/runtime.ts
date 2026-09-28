import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  PostContent,
} from "@riebeckite/core";
import {
  BASES_ATTRIBUTE,
  createBasesPlaceholderPattern,
  decodeBasesPayload,
} from "./placeholder.js";
import { renderBases, renderBasesError } from "./render.js";
import type { BasesOptions } from "./types.js";

export type BasesRuntime = {
  /**
   * Remembers the processed content object for a slug. `ContentManager` caches
   * and reuses this exact object, so replacing its `html` here is what makes the
   * rewrite visible to consumers that render `getProcessedContent()`.
   */
  track(slug: string, content: PostContent): void;
  /** Replaces every Base placeholder in the manifest with rendered output. */
  resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void;
};

export function createBasesRuntime(options: BasesOptions): BasesRuntime {
  const tracked = new Map<string, PostContent>();

  return {
    track(slug, content) {
      tracked.set(slug, content);
    },
    resolve(manifest, diagnostics) {
      const entries = manifest.entries;
      for (const entry of entries) {
        if (!entry.html.includes(BASES_ATTRIBUTE)) continue;

        const html = replacePlaceholders(entry, entries, options, diagnostics);
        if (html === entry.html) continue;

        entry.html = html;
        const content = tracked.get(entry.slug);
        if (content) content.html = html;
      }
    },
  };
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  entries: readonly ContentManifestEntry[],
  options: BasesOptions,
  diagnostics: Diagnostic[],
): string {
  const pattern = createBasesPlaceholderPattern();

  return entry.html.replace(pattern, (_match, encoded: string) => {
    const payload = decodeBasesPayload(encoded);
    if (!payload) {
      const message = `Base block in \`${entry.slug}\` could not be decoded.`;
      diagnostics.push(diagnostic(entry, message));
      return renderBasesError(message, options);
    }

    try {
      return renderBases(payload.spec, options, entries, payload.source);
    } catch (error) {
      const message = `Base block in \`${entry.slug}\` failed to render (${formatError(error)}).`;
      diagnostics.push(diagnostic(entry, message));
      return renderBasesError(message, options);
    }
  });
}

function diagnostic(
  entry: ContentManifestEntry,
  message: string,
): Diagnostic {
  return {
    code: "bases-invalid",
    severity: "error",
    pluginName: "bases",
    slug: entry.slug,
    message,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
