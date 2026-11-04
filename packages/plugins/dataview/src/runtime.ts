import {
  type ContentManifest,
  type ContentManifestEntry,
  type ContentSource,
  type Diagnostic,
  normalizeContentPath,
  selectLocalizedEntries,
} from "@riebeckite/core";
import {
  type DataviewNote,
  loadDataviewNotes,
  matchesDataviewFrom,
  selectDataviewEntries,
} from "./evaluate.js";
import { parseDataview } from "./parse.js";
import {
  createDataviewPlaceholderPattern,
  DATAVIEW_ATTRIBUTE,
  decodeDataviewSource,
} from "./placeholder.js";
import { renderDataview, renderDataviewError } from "./render.js";
import {
  type DataviewOptions,
  type DataviewSpec,
  type ResolvedDataviewOptions,
  resolveDataviewOptions,
} from "./types.js";

export type DataviewRuntimeContext = {
  readonly contentSource?: ContentSource;
  readonly buildTime?: Date;
};

type DataviewRuntime = {
  resolve(
    manifest: ContentManifest,
    diagnostics: Diagnostic[],
    context?: DataviewRuntimeContext,
  ): Promise<void>;
};

const DATAVIEWJS_MARKER = "language-dataviewjs";
const PLUGIN_NAME = "dataview";
const MARKDOWN_PATH = /^(.*)\.(md|markdown)$/i;

export function createDataviewRuntime(
  options: DataviewOptions = {},
): DataviewRuntime {
  const resolved = resolveDataviewOptions(options);

  return {
    async resolve(manifest, diagnostics, context = {}) {
      const hasBlocks = manifest.entries.some(
        (entry) =>
          entry.html.includes(DATAVIEW_ATTRIBUTE) ||
          entry.html.includes(DATAVIEWJS_MARKER),
      );
      if (!hasBlocks) return;

      const notes = await loadNotes(
        context.contentSource,
        dataviewNoteEntries(manifest),
      );
      const buildTime = context.buildTime ?? new Date();

      for (const entry of manifest.entries) {
        if (
          !entry.html.includes(DATAVIEW_ATTRIBUTE) &&
          !entry.html.includes(DATAVIEWJS_MARKER)
        ) {
          continue;
        }

        const html = replacePlaceholders(
          entry,
          {
            ...manifest,
            entries: [
              ...selectLocalizedEntries(manifest.discoverableEntries, {
                mode: resolved.localeMode,
                locale: entry.publicLocation.language,
                ...(manifest.localization?.fallbackLocale
                  ? { fallbackLocale: manifest.localization.fallbackLocale }
                  : {}),
              }),
            ],
          },
          resolved,
          diagnostics,
          notes,
          buildTime,
        );
        if (html === entry.html) continue;

        entry.html = html;
      }
    },
  };
}

function dataviewNoteEntries(
  manifest: ContentManifest,
): readonly ContentManifestEntry[] {
  const all = manifest.discoverableEntries;
  const matched = new Set<ContentManifestEntry>();
  for (const entry of manifest.entries) {
    if (!entry.html.includes(DATAVIEW_ATTRIBUTE)) continue;
    const pattern = createDataviewPlaceholderPattern();
    for (const match of entry.html.matchAll(pattern)) {
      let spec: DataviewSpec;
      try {
        const parsed = parseDataview(decodeDataviewSource(match[1] ?? ""));
        if (parsed.status !== "ok") continue;
        spec = parsed.spec;
      } catch {
        continue;
      }
      const first = spec.commands?.[0];
      if (first?.kind !== "from") return all;
      for (const candidate of all) {
        if (matchesDataviewFrom(first.from, candidate, manifest)) {
          matched.add(candidate);
        }
      }
    }
  }
  return all.filter((entry) => matched.has(entry));
}

async function loadNotes(
  source: ContentSource | undefined,
  entries: readonly ContentManifestEntry[],
): Promise<ReadonlyMap<string, DataviewNote>> {
  if (!source || entries.length === 0) return new Map();

  const scanned = await source.scan();
  const bySlug = new Map<string, string>();
  for (const entry of scanned) {
    const match = MARKDOWN_PATH.exec(entry.path);
    if (!match) continue;
    bySlug.set(normalizeContentPath(match[1] ?? ""), entry.path);
  }

  return loadDataviewNotes(entries, async (entry) => {
    const path = bySlug.get(normalizeContentPath(entry.slug));
    if (!path) return null;
    const content = await source.read({ path });
    return typeof content === "string"
      ? content
      : new TextDecoder().decode(content);
  });
}

function replacePlaceholders(
  entry: ContentManifestEntry,
  manifest: ContentManifest,
  options: ResolvedDataviewOptions,
  diagnostics: Diagnostic[],
  notes: ReadonlyMap<string, DataviewNote>,
  buildTime: Date,
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
        { notes, buildTime },
      );
      return renderDataview(selection, parsed.spec, options, source, {
        manifest,
        buildTime,
      });
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
