import type {
  ContentManifest,
  ContentManifestEntry,
  ContentQuerySpec,
  Diagnostic,
  PostContent,
} from "@riebeckite/core";
import { queryContentEntries } from "@riebeckite/core";
import { matter } from "vfile-matter";
import {
  QUERY_ATTRIBUTE,
  createQueryPlaceholderPattern,
  decodeQuerySpec,
} from "./placeholder.js";
import { renderQueryError, renderQueryResult, resolveQuery } from "./render.js";
import type { QueryOptions, QuerySpec } from "./types.js";

export type QueryRuntime = {
  track(slug: string, content: PostContent): void;
  resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void;
};

const KNOWN_KEYS = new Set([
  "filter",
  "sort",
  "limit",
  "offset",
  "format",
  "columns",
  "excludeSelf",
  "empty",
]);

export function createQueryRuntime(options: QueryOptions): QueryRuntime {
  const tracked = new Map<string, PostContent>();

  return {
    track(slug, content) {
      tracked.set(slug, content);
    },
    resolve(manifest, diagnostics) {
      const entries = manifest.entries;
      for (const entry of entries) {
        if (!entry.html.includes(QUERY_ATTRIBUTE)) continue;

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
  options: QueryOptions,
  diagnostics: Diagnostic[],
): string {
  const pattern = createQueryPlaceholderPattern();

  return entry.html.replace(pattern, (_match, encoded: string) => {
    const parsed = parseBlock(entry, encoded, options, diagnostics);
    if (typeof parsed === "string") return parsed;

    const query = resolveQuery(parsed, options);
    const excludeSelf = parsed.excludeSelf ?? options.excludeSelf ?? false;
    const pool = excludeSelf
      ? entries.filter((candidate) => candidate.slug !== entry.slug)
      : entries;

    const selected = queryContentEntries(pool, parsed as ContentQuerySpec);
    return renderQueryResult(selected, query);
  });
}

function parseBlock(
  entry: ContentManifestEntry,
  encoded: string,
  options: QueryOptions,
  diagnostics: Diagnostic[],
): QuerySpec | string {
  let source: string;
  try {
    source = decodeQuerySpec(encoded);
  } catch (error) {
    return reportInvalid(
      entry,
      diagnostics,
      `could not be decoded (${formatError(error)})`,
      options,
    );
  }

  let parsed: unknown;
  try {
    parsed = parseYamlMapping(source);
  } catch (error) {
    return reportInvalid(
      entry,
      diagnostics,
      `is not valid YAML (${formatError(error)})`,
      options,
    );
  }

  if (parsed === null || parsed === undefined) return {};

  if (typeof parsed !== "object" || Array.isArray(parsed)) {
    return reportInvalid(entry, diagnostics, "must be a YAML mapping", options);
  }

  const spec = parsed as QuerySpec;
  for (const key of Object.keys(spec)) {
    if (KNOWN_KEYS.has(key)) continue;
    diagnostics.push({
      code: "content-query-unknown-field",
      severity: "warning",
      pluginName: "query",
      slug: entry.slug,
      message: `Unknown query field \`${key}\` was ignored.`,
    });
  }
  return spec;
}

function reportInvalid(
  entry: ContentManifestEntry,
  diagnostics: Diagnostic[],
  reason: string,
  options: QueryOptions,
): string {
  const message = `Query block in \`${entry.slug}\` ${reason}.`;
  diagnostics.push({
    code: "content-query-invalid",
    severity: "error",
    pluginName: "query",
    slug: entry.slug,
    message,
  });
  return renderQueryError(message, options);
}

function parseYamlMapping(source: string): unknown {
  const document = `---\n${source}\n---\n`;
  const file = {
    value: document,
    data: {} as Record<string, unknown>,
    toString: () => document,
  };
  matter(file as unknown as Parameters<typeof matter>[0]);
  return file.data.matter;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
