import type { Diagnostic } from "@riebeckite/core";

export function pathList(value: unknown): readonly string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }
  return [];
}

/**
 * Frontmatter paths are document-relative first, then content-root relative.
 * Every candidate still goes through `ContentSource.scan()`, so no candidate can
 * escape the configured content root.
 */
export function pageRelativeCandidates(
  path: string,
  sourceSlug: string | undefined,
): readonly string[] {
  const normalized = normalizeLogicalPath(path);
  if (!sourceSlug || isAbsoluteLikePath(normalized)) return [normalized];

  const directory = normalizeLogicalPath(sourceSlug)
    .split("/")
    .slice(0, -1)
    .join("/");
  if (!directory) return [normalized];

  const relative = normalizeLogicalPath(`${directory}/${normalized}`);
  return relative === normalized ? [normalized] : [relative, normalized];
}

function isAbsoluteLikePath(path: string): boolean {
  return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

export function normalizeLogicalPath(path: string): string {
  const parts: string[] = [];
  for (const segment of path.replace(/\\/g, "/").split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") {
      if (parts.length > 0 && parts.at(-1) !== "..") parts.pop();
      else parts.push(segment);
      continue;
    }
    parts.push(segment);
  }
  const prefix = path.startsWith("/") ? "/" : "";
  return `${prefix}${parts.join("/")}`;
}

export function pushUniqueDiagnostics(
  target: Diagnostic[],
  diagnostics: readonly Diagnostic[],
  slug: string | undefined,
): void {
  for (const diagnostic of diagnostics) {
    const next = diagnostic.slug ? diagnostic : { ...diagnostic, slug };
    const signature = diagnosticSignature(next);
    if (target.some((item) => diagnosticSignature(item) === signature))
      continue;
    target.push(next);
  }
}

function diagnosticSignature(diagnostic: Diagnostic): string {
  return `${diagnostic.code}:${diagnostic.slug ?? ""}:${diagnostic.filePath ?? ""}:${diagnostic.target ?? ""}:${diagnostic.message}`;
}
