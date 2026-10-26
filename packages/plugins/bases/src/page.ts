import {
  type ContentManifest,
  type ContentSource,
  type Diagnostic,
  escapeHtml,
  type PluginPage,
  readContentSourceEntry,
} from "@riebeckite/core";
import { analyzeBasesDependencies } from "./dependencies.js";
import { parseBases } from "./parse.js";
import { renderBases, renderBasesError } from "./render.js";
import type { BasesOptions } from "./types.js";
import { parseBasesYaml } from "./yaml.js";

const BASE_SUFFIX = /\.base$/i;

type BaseDocument = {
  readonly pathname: string;
  readonly dependencies: readonly import("@riebeckite/core").OutputDependency[];
};

export async function listBaseDocuments(input: {
  readonly manifest: ContentManifest;
  readonly contentSource?: ContentSource;
  readonly diagnostics: Diagnostic[];
}): Promise<readonly BaseDocument[]> {
  if (!input.contentSource) return [];
  const documents: BaseDocument[] = [];
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
    if (!source) {
      input.diagnostics.push(
        diagnostic(
          slug,
          `Base \`${slug}\` is not a valid Bases YAML document.`,
        ),
      );
      continue;
    }
    const parsed = parseBase(source);
    if (parsed.ok === false) {
      input.diagnostics.push(
        diagnostic(
          slug,
          `Base \`${slug}\` is not a valid Bases YAML document.`,
        ),
      );
      continue;
    }
    documents.push({
      pathname,
      dependencies: [
        { type: "file", path: slug },
        analyzeBasesDependencies(parsed.value),
      ],
    });
  }
  return documents;
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
  let body: string;
  try {
    body = renderBases(
      parsed.value,
      options,
      input.manifest.discoverableEntries,
      source,
    );
  } catch (error) {
    const message = `Base \`${slug}\` failed to render (${formatError(error)}).`;
    input.diagnostics.push(diagnostic(slug, message));
    body = renderBasesError(message, options);
  }
  return {
    type: "bases-document",
    pathname: input.pathname,
    title,
    body: `<main class="rb-bases-page"><h1 class="rb-bases-page__title">${escapeHtml(title)}</h1>${body}</main>`,
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
function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
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
