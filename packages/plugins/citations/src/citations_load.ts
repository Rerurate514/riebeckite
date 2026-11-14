import type { Diagnostic } from "@riebeckite/core";
import { parseBibliography } from "./bibliography.js";
import {
  pageRelativeCandidates,
  pathList,
  pushUniqueDiagnostics,
} from "./paths.js";
import type {
  BibliographyEntry,
  CachedBibliography,
  ParsedBibliography,
  RemarkCitationsOptions,
} from "./types.js";

export function bibliographyPathGroups(
  options: RemarkCitationsOptions,
  frontmatter: Record<string, unknown> | undefined,
): readonly (readonly string[])[] {
  if (frontmatter?.bibliography !== undefined) {
    return pathList(frontmatter.bibliography).map((path) =>
      pageRelativeCandidates(path, options.sourceSlug),
    );
  }
  return pathList(options.bibliography).map((path) => [path]);
}

export async function loadBibliographies(
  pathGroups: readonly (readonly string[])[],
  options: RemarkCitationsOptions,
): Promise<ParsedBibliography> {
  const entries = new Map<string, BibliographyEntry>();
  const diagnostics: Diagnostic[] = [];

  for (const candidates of pathGroups) {
    const resolved = await loadFirstAvailable(candidates, options);
    if (!resolved) {
      diagnostics.push({
        code: "citation-missing-bibliography",
        severity: "error",
        message: `Bibliography file was not found: ${candidates[0] ?? ""}`,
        filePath: candidates[0],
      });
      continue;
    }

    diagnostics.push(...resolved.parsed.diagnostics);
    for (const [key, entry] of resolved.parsed.entries) {
      if (entries.has(key)) {
        diagnostics.push({
          code: "citation-duplicate-key",
          severity: "warning",
          message: `Duplicate bibliography key: ${key}`,
          filePath: resolved.path,
          target: key,
        });
      } else {
        entries.set(key, entry);
      }
    }
  }

  pushUniqueDiagnostics(options.diagnostics, diagnostics, options.sourceSlug);
  return { entries, diagnostics };
}

export async function loadFirstAvailable(
  candidates: readonly string[],
  options: RemarkCitationsOptions,
): Promise<{ path: string; parsed: ParsedBibliography } | null> {
  for (const path of candidates) {
    const resolved = await cachedBibliography(path, options);
    if (resolved.found) return { path, parsed: resolved.parsed };
  }
  return null;
}

export async function cachedBibliography(
  path: string,
  options: RemarkCitationsOptions,
): Promise<CachedBibliography> {
  const cached = options.cache.get(path);
  if (cached) return cached;

  const promise = (async (): Promise<CachedBibliography> => {
    const source = await options.loadBibliography(path);
    if (source === null) {
      return {
        found: false,
        parsed: { entries: new Map(), diagnostics: [] },
      };
    }
    return { found: true, parsed: parseBibliography(source, path) };
  })();

  options.cache.set(path, promise);
  return promise;
}
