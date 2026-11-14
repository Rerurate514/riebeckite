import type { ContentManifestEntry, Diagnostic } from "@riebeckite/core";
import { diagnostic, normalizeRoutePath } from "./site_integrity_shared.js";
import type { SiteIntegrityOptions } from "./site_integrity_types.js";

export function checkResolvedLinks(
  entry: ContentManifestEntry,
  publicSlugs: ReadonlySet<string>,
  assetPaths: ReadonlySet<string>,
  noteSlugs: ReadonlySet<string>,
  ambiguities: ReadonlyMap<string, readonly string[]>,
  diagnostics: Diagnostic[],
  options: SiteIntegrityOptions,
): void {
  for (const link of entry.links) {
    if (link.kind === "unresolved") {
      const ambiguity = ambiguities.get(link.raw.toLowerCase());
      if (ambiguity && ambiguity.length > 0) {
        diagnostics.push(
          createAmbiguousWikilinkDiagnostic(
            entry,
            link.raw,
            link.embed,
            ambiguity,
            noteSlugs,
            publicSlugs,
            options,
          ),
        );
        continue;
      }
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:unresolved-wikilink",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.raw,
          message: `WikiLink target "${link.raw}" could not be resolved.`,
          suggestion:
            "Create the target note/asset or update the WikiLink target.",
          meta: { raw: link.raw, embed: link.embed },
        }),
      );
      continue;
    }

    if (link.kind === "note" && link.slug && !publicSlugs.has(link.slug)) {
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:broken-link",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.slug,
          message: `Content link "${link.raw}" resolves to unpublished content "${link.slug}".`,
          suggestion:
            "Publish the target content or remove the reference from published content.",
          meta: {
            raw: link.raw,
            resolvedSlug: link.slug,
            reason: "unpublished-target",
          },
        }),
      );
    }

    if (
      (link.kind === "image" || link.kind === "attachment") &&
      link.slug &&
      !assetPaths.has(link.slug)
    ) {
      diagnostics.push(
        diagnostic(options, {
          code: "content-integrity:broken-asset",
          slug: entry.slug,
          filePath: `${entry.slug}.md`,
          target: link.slug,
          message: `Asset reference "${link.raw}" resolves to "${link.slug}", but no asset is published for that path.`,
          suggestion:
            "Add the asset, fix the reference, or register the generated asset from a plugin.",
          meta: { raw: link.raw, resolvedPath: link.slug },
        }),
      );
    }
  }
}

export function createAmbiguousWikilinkDiagnostic(
  entry: ContentManifestEntry,
  raw: string,
  embed: boolean,
  candidates: readonly string[],
  noteSlugs: ReadonlySet<string>,
  publicSlugs: ReadonlySet<string>,
  options: SiteIntegrityOptions,
): Diagnostic {
  const visible: string[] = [];
  let unpublishedCount = 0;
  for (const candidate of candidates) {
    if (!noteSlugs.has(candidate)) {
      visible.push(candidate);
      continue;
    }
    if (publicSlugs.has(candidate)) visible.push(candidate);
    else unpublishedCount += 1;
  }

  const described = [...visible];
  if (unpublishedCount > 0)
    described.push(`${unpublishedCount} unpublished candidate(s)`);
  const first = visible[0];
  const suggestion = first
    ? `Use an explicit path such as [[${first}]].`
    : "Rename one of the duplicate targets or reference it by a unique path.";

  return diagnostic(options, {
    code: "content-integrity:ambiguous-wikilink",
    slug: entry.slug,
    filePath: `${entry.slug}.md`,
    target: raw,
    message: `WikiLink target "${raw}" matches multiple candidates: ${described.join(", ")}.`,
    suggestion,
    meta: {
      raw,
      embed,
      candidates: visible,
      ...(unpublishedCount > 0
        ? { unpublishedCandidateCount: unpublishedCount }
        : {}),
    },
  });
}

export function extractAttributes(
  html: string,
  attribute: "href" | "src",
): string[] {
  const pattern = new RegExp(
    `${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`,
    "gi",
  );
  const values: string[] = [];
  for (let match = pattern.exec(html); match; match = pattern.exec(html)) {
    const value = match[1] ?? match[2] ?? match[3];
    if (value) values.push(value);
  }
  return values;
}

export function isSiteLocalReference(value: string): boolean {
  if (!value || value.startsWith("#") || value.startsWith("//")) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return true;
}

export function normalizeReferencePath(
  value: string,
  basePath: string,
): string | null {
  const path = value.split(/[?#]/)[0] ?? "";
  if (!path || path === "/") return path || null;
  try {
    return normalizeRoutePath(resolveReferencePath(decodeURI(path), basePath));
  } catch {
    return null;
  }
}

export function resolveReferencePath(path: string, basePath: string): string {
  if (path.startsWith("/")) return path;
  const baseSegments = basePath.split("/").filter(Boolean);
  if (!basePath.endsWith("/")) baseSegments.pop();
  const segments = [...baseSegments, ...path.split("/")];
  const normalized: string[] = [];
  for (const segment of segments) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      normalized.pop();
      continue;
    }
    normalized.push(segment);
  }
  return `/${normalized.join("/")}`;
}
