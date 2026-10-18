import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
  OutputDependency,
  ResolvedRiebeckiteConfig,
} from "@riebeckite/core";
import { analyzeBasesDependencies } from "./dependencies.js";
import {
  BASES_ATTRIBUTE,
  createBasesPlaceholderPattern,
  decodeBasesPayload,
} from "./placeholder.js";
import { renderBases, renderBasesError } from "./render.js";
import type { BasesOptions } from "./types.js";

export type BasesRuntime = {
  /** Replaces every Base placeholder in the manifest with rendered output. */
  resolve(
    manifest: ContentManifest,
    diagnostics: Diagnostic[],
    config?: ResolvedRiebeckiteConfig,
  ): void;
  dependenciesFor(slug: string): readonly OutputDependency[];
  dependenciesForPage(pathname: string): readonly OutputDependency[];
};

export function createBasesRuntime(options: BasesOptions): BasesRuntime {
  const dependencies = new Map<string, readonly OutputDependency[]>();
  return {
    resolve(manifest, diagnostics, _config) {
      const entries = manifest.discoverableEntries;
      for (const entry of manifest.publicEntries) {
        if (!entry.html.includes(BASES_ATTRIBUTE)) continue;

        const resolved = replacePlaceholders(
          entry,
          entries,
          options,
          diagnostics,
        );
        dependencies.set(entry.slug, resolved.dependencies);
        const html = resolved.html;
        if (html === entry.html) continue;

        entry.html = html;
      }
    },
    dependenciesFor(slug) {
      return dependencies.get(slug) ?? [];
    },
    dependenciesForPage(pathname) {
      return [
        { type: "file", path: `${pathname.replace(/^\//, "")}.base` },
        { type: "content-query", properties: ["*"], unknown: true },
      ];
    },
  };
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  entries: readonly ContentManifestEntry[],
  options: BasesOptions,
  diagnostics: Diagnostic[],
): {
  readonly html: string;
  readonly dependencies: readonly OutputDependency[];
} {
  const pattern = createBasesPlaceholderPattern();
  const dependencies: OutputDependency[] = [];

  const html = entry.html.replace(pattern, (_match, encoded: string) => {
    const payload = decodeBasesPayload(encoded);
    if (!payload) {
      const message = `Base block in \`${entry.slug}\` could not be decoded.`;
      diagnostics.push(diagnostic(entry, message));
      return renderBasesError(message, options);
    }

    try {
      dependencies.push(analyzeBasesDependencies(payload.spec));
      return renderBases(payload.spec, options, entries, payload.source);
    } catch (error) {
      const message = `Base block in \`${entry.slug}\` failed to render (${formatError(error)}).`;
      diagnostics.push(diagnostic(entry, message));
      return renderBasesError(message, options);
    }
  });
  return { html, dependencies };
}

function diagnostic(entry: ContentManifestEntry, message: string): Diagnostic {
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
