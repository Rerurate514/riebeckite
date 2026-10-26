import {
  type ContentManifest,
  type ContentSource,
  type Diagnostic,
  type PluginPage,
  readContentSourceEntry,
} from "@riebeckite/core";
import { parseBibliography } from "./bibliography.js";
import {
  normalizeLogicalPath,
  pageRelativeCandidates,
  pathList,
  pushUniqueDiagnostics,
} from "./paths.js";
import { renderBibliographyPage } from "./render.js";
import type { BibliographyEntry, CitationsOptions } from "./types.js";

const PLUGIN_NAME = "citations";
const PAGE_TITLE = "Bibliography";
const EXTENSION = /\.[a-zA-Z0-9]+$/;

type BibliographyPageSource = {
  readonly manifest: ContentManifest;
  readonly contentSource?: ContentSource;
  readonly diagnostics: Diagnostic[];
};

export async function listBibliographyPagePaths(
  source: BibliographyPageSource,
  options: CitationsOptions,
): Promise<string[]> {
  const pagePath = bibliographyPagePath(options.pagePath);
  if (!pagePath) return [];
  if (isContentRoute(source.manifest, pagePath)) {
    source.diagnostics.push({
      code: "citations-page-conflict",
      severity: "warning",
      pluginName: PLUGIN_NAME,
      message: `Skipping bibliography page ${pagePath}: a content route already owns it.`,
      target: pagePath,
    });
    return [];
  }

  const entries = await collectBibliographyEntries(source, options);
  return entries.size > 0 ? [pagePath] : [];
}

export async function resolveBibliographyPage(
  context: BibliographyPageSource & { readonly pathname: string },
  options: CitationsOptions,
): Promise<PluginPage | null> {
  const pagePath = bibliographyPagePath(options.pagePath);
  if (!pagePath || pagePath !== context.pathname) return null;
  if (isContentRoute(context.manifest, context.pathname)) return null;

  const entries = await collectBibliographyEntries(context, options);
  if (entries.size === 0) return null;

  const sorted = [...entries.entries()].toSorted((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  );

  return {
    type: "citations-bibliography",
    pathname: context.pathname,
    title: PAGE_TITLE,
    body: renderBibliographyPage({ title: PAGE_TITLE, entries: sorted }),
  };
}

function bibliographyPagePath(value: string | undefined): string | null {
  if (typeof value !== "string") return null;
  const segments = normalizeLogicalPath(value)
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean);
  if (segments.length === 0) return null;
  if (EXTENSION.test(segments[segments.length - 1] ?? "")) return null;
  return `/${segments.join("/")}`;
}

function isContentRoute(manifest: ContentManifest, pathname: string): boolean {
  return (
    manifest.byRoutablePermalink.has(pathname) ||
    manifest.publicRedirects.has(pathname)
  );
}

function collectBibliographyGroups(
  manifest: ContentManifest,
  options: CitationsOptions,
): readonly (readonly string[])[] {
  const groups: string[][] = [];
  for (const path of pathList(options.bibliography)) {
    groups.push([path]);
  }

  const frontmatterEntries = manifest.discoverableEntries
    .filter((entry) => entry.frontmatter.bibliography !== undefined)
    .toSorted((a, b) => (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0));
  for (const entry of frontmatterEntries) {
    for (const path of pathList(entry.frontmatter.bibliography)) {
      groups.push([...pageRelativeCandidates(path, entry.slug)]);
    }
  }
  return groups;
}

async function collectBibliographyEntries(
  source: BibliographyPageSource,
  options: CitationsOptions,
): Promise<Map<string, BibliographyEntry>> {
  const groups = collectBibliographyGroups(source.manifest, options);
  const entries = new Map<string, BibliographyEntry>();
  const loaded = new Set<string>();
  const collected: Diagnostic[] = [];

  for (const candidates of groups) {
    const resolved = await loadFirstAvailable(source.contentSource, candidates);
    if (!resolved) {
      collected.push({
        code: "citation-missing-bibliography",
        severity: "error",
        message: `Bibliography file was not found: ${candidates[0] ?? ""}`,
        filePath: candidates[0],
      });
      continue;
    }
    if (loaded.has(resolved.path)) continue;
    loaded.add(resolved.path);
    collected.push(...resolved.parsed.diagnostics);
    mergeEntries(entries, resolved.parsed.entries, resolved.path, collected);
  }

  pushUniqueDiagnostics(source.diagnostics, collected, undefined);
  return entries;
}

async function loadFirstAvailable(
  source: ContentSource | undefined,
  candidates: readonly string[],
): Promise<{
  path: string;
  parsed: ReturnType<typeof parseBibliography>;
} | null> {
  if (!source) return null;
  for (const path of candidates) {
    const raw = await readContentSourceEntry(source, path);
    if (raw === null) continue;
    const text = typeof raw === "string" ? raw : new TextDecoder().decode(raw);
    return { path, parsed: parseBibliography(text, path) };
  }
  return null;
}

function mergeEntries(
  target: Map<string, BibliographyEntry>,
  incoming: ReadonlyMap<string, BibliographyEntry>,
  filePath: string,
  diagnostics: Diagnostic[],
): void {
  for (const [key, entry] of incoming) {
    const existing = target.get(key);
    if (!existing) {
      target.set(key, entry);
      continue;
    }
    if (sameEntry(existing, entry)) continue;
    diagnostics.push({
      code: "citation-duplicate-key",
      severity: "warning",
      message: `Duplicate bibliography key: ${key}`,
      filePath,
      target: key,
    });
  }
}

function sameEntry(a: BibliographyEntry, b: BibliographyEntry): boolean {
  if (a.type !== b.type) return false;
  const aKeys = Object.keys(a.fields).toSorted();
  const bKeys = Object.keys(b.fields).toSorted();
  if (aKeys.length !== bKeys.length) return false;
  for (let index = 0; index < aKeys.length; index += 1) {
    const key = aKeys[index] ?? "";
    if (key !== bKeys[index]) return false;
    if (a.fields[key] !== b.fields[key]) return false;
  }
  return true;
}
