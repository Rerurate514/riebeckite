import type {
  ContentManifest,
  ContentManifestEntry,
  Diagnostic,
} from "@riebeckite/core";
import { selectDataviewEntries } from "./evaluate.js";
import { parseDataview } from "./parse.js";
import {
  createDataviewPlaceholderPattern,
  DATAVIEW_ATTRIBUTE,
  decodeDataviewSource,
} from "./placeholder.js";
import { renderDataview, renderDataviewError } from "./render.js";
import {
  type DataviewOptions,
  type ResolvedDataviewOptions,
  resolveDataviewOptions,
} from "./types.js";

export type DataviewRuntime = {
  resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void;
};

const DATAVIEWJS_MARKER = "language-dataviewjs";
const PLUGIN_NAME = "dataview";

export function createDataviewRuntime(
  options: DataviewOptions = {},
): DataviewRuntime {
  const resolved = resolveDataviewOptions(options);

  return {
    resolve(manifest, diagnostics) {
      for (const entry of manifest.entries) {
        if (
          !entry.html.includes(DATAVIEW_ATTRIBUTE) &&
          !entry.html.includes(DATAVIEWJS_MARKER)
        ) {
          continue;
        }

        const html = replacePlaceholders(
          entry,
          manifest,
          resolved,
          diagnostics,
        );
        if (html === entry.html) continue;

        entry.html = html;
      }
    },
  };
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  options: ResolvedDataviewOptions,
  diagnostics: Diagnostic[],
): string {
  if (entry.html.includes(DATAVIEWJS_MARKER)) {
    diagnostics.push({
      code: "dataview-unsupported-language",
      severity: "warning",
      pluginName: PLUGIN_NAME,
      slug: entry.slug,
      message:
        "DataviewJS (`dataviewjs`) blocks are not supported and were left as code blocks.",
    });
  }

  if (!entry.html.includes(DATAVIEW_ATTRIBUTE)) return entry.html;

  const pattern = createDataviewPlaceholderPattern();
  return entry.html.replace(pattern, (_match, encoded: string) => {
    let source: string;
    try {
      source = decodeDataviewSource(encoded);
    } catch (error) {
      const message = `Dataview block in \`${entry.slug}\` could not be decoded (${formatError(error)}).`;
      reportInvalid(entry, diagnostics, message);
      return renderDataviewError(message, "", options);
    }

    const parsed = parseDataview(source);
    if (parsed.status === "error") {
      const message = `Dataview block in \`${entry.slug}\` ${parsed.message}`;
      reportInvalid(entry, diagnostics, message);
      return renderDataviewError(message, source, options);
    }

    try {
      const selection = selectDataviewEntries(
        parsed.spec,
        manifest,
        options.limit,
      );
      return renderDataview(selection, parsed.spec, options, source);
    } catch (error) {
      const message = `Dataview block in \`${entry.slug}\` is unsupported: ${formatError(error)}`;
      reportInvalid(entry, diagnostics, message);
      return renderDataviewError(message, source, options);
    }
  });
}

function reportInvalid(
  entry: ContentManifestEntry,
  diagnostics: Diagnostic[],
  message: string,
): void {
  diagnostics.push({
    code: "dataview-invalid",
    severity: "error",
    pluginName: PLUGIN_NAME,
    slug: entry.slug,
    message,
  });
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
