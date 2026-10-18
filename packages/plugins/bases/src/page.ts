import {
  type ContentManifest,
  type ContentSource,
  type Diagnostic,
  escapeHtml,
  type PluginPage,
  readContentSourceEntry,
} from "@riebeckite/core";
import { parseBases } from "./parse.js";
import { renderBases } from "./render.js";
import type { BasesOptions } from "./types.js";
import { parseBasesYaml } from "./yaml.js";

const BASE_SUFFIX = /\.base$/i;

export async function listBaseDocumentPaths(input: {
  readonly manifest: ContentManifest;
  readonly contentSource?: ContentSource;
  readonly diagnostics: Diagnostic[];
}): Promise<readonly string[]> {
  if (!input.contentSource) return [];
  const paths: string[] = [];
  for (const slug of publicBaseSlugs(input.manifest)) {
    const pathname = basePath(slug);
    if (
      !pathname ||
      input.manifest.byRoutablePermalink.has(pathname) ||
      input.manifest.publicRedirects.has(pathname)
    ) {
      if (pathname)
        input.diagnostics.push(
          diagnostic(
            slug,
            `Base page \`${pathname}\` conflicts with an existing public route.`,
          ),
        );
      continue;
    }
    const source = await readBase(input.contentSource, slug);
    if (!source || !parseBase(source).ok) {
      input.diagnostics.push(
        diagnostic(
          slug,
          `Base \`${slug}\` is not a valid Bases YAML document.`,
        ),
      );
      continue;
    }
    paths.push(pathname);
  }
  return paths;
}

export async function resolveBaseDocument(
  input: {
    readonly manifest: ContentManifest;
    readonly contentSource?: ContentSource;
    readonly pathname: string;
    readonly diagnostics: Diagnostic[];
  },
  options: BasesOptions,
): Promise<PluginPage | null> {
  if (!input.contentSource) return null;
  const slug = publicBaseSlugs(input.manifest).find(
    (candidate) => basePath(candidate) === input.pathname,
  );
  if (
    !slug ||
    input.manifest.byRoutablePermalink.has(input.pathname) ||
    input.manifest.publicRedirects.has(input.pathname)
  )
    return null;
  const source = await readBase(input.contentSource, slug);
  if (!source) return null;
  const parsed = parseBase(source);
  if (parsed.ok === false) {
    input.diagnostics.push(diagnostic(slug, parsed.message));
    return null;
  }
  const title = slug.split("/").at(-1)?.replace(BASE_SUFFIX, "") ?? slug;
  return {
    type: "bases-document",
    pathname: input.pathname,
    title,
    body: `<main class="rb-bases-page"><h1 class="rb-bases-page__title">${escapeHtml(title)}</h1>${renderBases(parsed.value, options, input.manifest.publicEntries, source)}</main>`,
  };
}

function publicBaseSlugs(manifest: ContentManifest): readonly string[] {
  const slugs = new Set<string>();
  for (const entry of manifest.publicEntries)
    for (const link of entry.links)
      if (
        link.kind === "attachment" &&
        link.slug &&
        BASE_SUFFIX.test(link.slug)
      )
        slugs.add(link.slug);
  return [...slugs].sort();
}
function basePath(slug: string): string | null {
  const pathname = `/${slug.replace(BASE_SUFFIX, "")}`.replace(/\/+/g, "/");
  return pathname === "/" ? null : pathname;
}
async function readBase(
  source: ContentSource,
  slug: string,
): Promise<string | null> {
  try {
    const raw = await readContentSourceEntry(source, slug);
    return raw === null
      ? null
      : typeof raw === "string"
        ? raw
        : new TextDecoder().decode(raw);
  } catch {
    return null;
  }
}
function parseBase(
  source: string,
):
  | { readonly ok: true; readonly value: import("./types.js").BasesSpec }
  | { readonly ok: false; readonly message: string } {
  const yaml = parseBasesYaml(source);
  if (yaml.ok === false) return yaml;
  return parseBases(yaml.value);
}
function diagnostic(slug: string, message: string): Diagnostic {
  return {
    code: "bases-invalid",
    severity: "warning",
    pluginName: "bases",
    target: slug,
    message,
  };
}
