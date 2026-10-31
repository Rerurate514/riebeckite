import type { ContentMutationIssue } from "./content_mutation.js";
import { extractLinkOccurrences } from "./link_occurrences.js";
import { rewriteLinkDestinations } from "./link_rewrite.js";

export type ContentLinkRetarget = {
  readonly from: string;
  readonly to?: string;
};

export type ContentLinkMutationPlan = {
  readonly updates: ReadonlyMap<string, string>;
  readonly warnings: readonly ContentMutationIssue[];
  readonly conflicts: readonly ContentMutationIssue[];
};

export function planContentLinkUpdates(options: {
  readonly files: ReadonlyMap<string, string>;
  readonly retargets: readonly ContentLinkRetarget[];
}): ContentLinkMutationPlan {
  const updates = new Map<string, string>();
  const warnings: ContentMutationIssue[] = [];
  const conflicts: ContentMutationIssue[] = [];
  if (options.retargets.length === 0) return { updates, warnings, conflicts };
  const index = buildIndex([...options.files.keys()]);
  const beforeIndex = buildBeforeIndex(options.files, options.retargets);

  for (const [filePath, source] of options.files) {
    if (!filePath.toLowerCase().endsWith(".md")) continue;
    const occurrences = extractLinkOccurrences(source, {
      sourcePath: filePath,
    });
    const rewrites = [];
    for (const occurrence of occurrences) {
      if (!occurrence.destinationRange) continue;
      const retarget = options.retargets.find((candidate) =>
        refersTo(occurrence, candidate.from, filePath, beforeIndex),
      );
      if (!retarget) continue;
      if (!retarget.to) {
        warnings.push({
          severity: "warning",
          code: "broken-link",
          path: filePath,
          message: `A link to deleted content remains: ${occurrence.rawDestination}`,
        });
        continue;
      }
      const replacement = replacementDestination(
        occurrence.syntax,
        retarget.to,
        filePath,
        occurrence.fragment,
      );
      if (replacement === null || replacement === occurrence.rawDestination)
        continue;
      if (!index.has(indexKey(retarget.to))) {
        conflicts.push({
          severity: "error",
          code: "link-target-missing",
          path: filePath,
          message: `The link target is missing from the mutation: ${retarget.to}`,
        });
        continue;
      }
      rewrites.push({
        range: occurrence.destinationRange,
        expected: source.slice(
          occurrence.destinationRange.start,
          occurrence.destinationRange.end,
        ),
        replacement,
      });
    }
    if (rewrites.length === 0) continue;
    const rewritten = rewriteLinkDestinations(source, rewrites);
    if (rewritten.ok) {
      updates.set(filePath, rewritten.content);
      continue;
    }
    conflicts.push({
      severity: "error",
      code: "link-rewrite-conflict",
      path: filePath,
      message: `Link rewriting failed: ${rewritten.reason}`,
    });
  }
  return { updates, warnings, conflicts };
}

function refersTo(
  occurrence: ReturnType<typeof extractLinkOccurrences>[number],
  from: string,
  sourcePath: string,
  beforeIndex: ReadonlyMap<string, readonly string[]>,
): boolean {
  const destination = occurrence.normalizedDestination.split("#", 1)[0] ?? "";
  if (!destination) return false;
  if (occurrence.syntax === "wikilink" || occurrence.syntax === "wiki-embed") {
    const candidates = beforeIndex.get(destination.toLowerCase());
    return (
      candidates?.length === 1 &&
      normalizePath(candidates[0] ?? "") === normalizePath(from)
    );
  }
  if (!occurrence.sourcePath) return false;
  const directory = sourcePath.split("/").slice(0, -1);
  const resolved = [...directory, ...destination.split("/")]
    .filter((part) => part && part !== ".")
    .join("/")
    .replace(/\.md$/i, "");
  return normalizePath(resolved) === normalizePath(from.replace(/\.md$/i, ""));
}

function replacementDestination(
  syntax: ReturnType<typeof extractLinkOccurrences>[number]["syntax"],
  to: string,
  sourcePath: string,
  fragment: string | undefined,
): string | null {
  if (syntax === "wikilink" || syntax === "wiki-embed")
    return to.replace(/\.md$/i, "");
  const directory = sourcePath.split("/").slice(0, -1);
  const targetParts = to.split("/");
  let common = 0;
  while (
    common < directory.length &&
    common < targetParts.length - 1 &&
    directory[common] === targetParts[common]
  )
    common += 1;
  const relative = [
    ...directory.slice(common).map(() => ".."),
    ...targetParts.slice(common),
  ].join("/");
  return `${encodeURI(relative)}${fragment ?? ""}`;
}

function buildIndex(paths: readonly string[]): Set<string> {
  const keys = new Set<string>();
  for (const filePath of paths) {
    for (const key of keysOf(filePath)) keys.add(key);
  }
  return keys;
}

function buildBeforeIndex(
  files: ReadonlyMap<string, string>,
  retargets: readonly ContentLinkRetarget[],
): Map<string, string[]> {
  const movedTo = new Map<string, string>();
  for (const retarget of retargets) {
    if (retarget.to) movedTo.set(normalizePath(retarget.to), retarget.from);
  }
  const paths = new Set<string>();
  for (const filePath of files.keys())
    paths.add(movedTo.get(normalizePath(filePath)) ?? filePath);
  for (const retarget of retargets) paths.add(retarget.from);
  const index = new Map<string, string[]>();
  for (const filePath of paths) {
    for (const key of keysOf(filePath)) {
      const candidates = index.get(key) ?? [];
      candidates.push(filePath);
      index.set(key, candidates);
    }
  }
  return index;
}

function normalizePath(filePath: string): string {
  return filePath.replaceAll("\\", "/").replace(/\.md$/i, "").toLowerCase();
}

function keysOf(filePath: string): string[] {
  const normalized = filePath.replaceAll("\\", "/");
  const withoutExtension = normalized.replace(/\.md$/i, "");
  const parts = withoutExtension.split("/");
  const keys: string[] = [];
  for (let index = 0; index < parts.length; index += 1)
    keys.push(parts.slice(index).join("/").toLowerCase());
  return keys;
}

function indexKey(filePath: string): string {
  return keysOf(filePath)[0] ?? filePath.toLowerCase();
}
