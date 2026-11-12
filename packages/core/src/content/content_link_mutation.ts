import type { ContentMutationIssue } from "./content_mutation.js";
import { extractLinkOccurrences } from "./link_occurrences.js";
import { linkResolutionKey } from "./link_resolution.js";
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

export type ContentLinkMutationOptions = {
  readonly files: ReadonlyMap<string, string>;
  readonly retargets: readonly ContentLinkRetarget[];
  readonly beforeIndex?: ReadonlyMap<string, string>;
  readonly afterIndex?: ReadonlyMap<string, string>;
  readonly beforeAmbiguities?: ReadonlyMap<string, readonly string[]>;
  readonly afterAmbiguities?: ReadonlyMap<string, readonly string[]>;
  readonly isContentPath?: (path: string) => boolean;
  readonly toSlug?: (path: string) => string | undefined;
};

export function planContentLinkUpdates(
  options: ContentLinkMutationOptions,
): ContentLinkMutationPlan {
  const updates = new Map<string, string>();
  const warnings: ContentMutationIssue[] = [];
  const conflicts: ContentMutationIssue[] = [];
  if (options.files.size === 0) return { updates, warnings, conflicts };
  const isContentPath =
    options.isContentPath ??
    ((filePath: string) => filePath.toLowerCase().endsWith(".md"));
  const keyOf = (filePath: string) => contentKey(filePath, options.toSlug);
  const index =
    options.afterIndex ?? buildIndex([...options.files.keys()], keyOf);
  const beforeIndex =
    options.beforeIndex ??
    buildBeforeIndex(options.files, options.retargets, keyOf);
  const movedFrom = new Map<string, string>();
  const retargetsByFrom = new Map<string, ContentLinkRetarget>();
  const actualPaths = new Map<string, string>();
  for (const filePath of options.files.keys())
    actualPaths.set(keyOf(filePath), filePath);
  for (const filePath of index.values()) {
    const key = keyOf(filePath);
    if (!actualPaths.has(key)) actualPaths.set(key, filePath);
  }
  for (const retarget of options.retargets) {
    if (retarget.to) movedFrom.set(keyOf(retarget.to), retarget.from);
    retargetsByFrom.set(keyOf(retarget.from), retarget);
  }

  for (const [filePath, source] of options.files) {
    if (!isContentPath(filePath)) continue;
    const previousPath = movedFrom.get(keyOf(filePath));
    const occurrenceSource = previousPath ?? filePath;
    const occurrences = extractLinkOccurrences(source, {
      sourcePath: filePath,
    });
    const rewrites = [];
    for (const occurrence of occurrences) {
      if (!occurrence.destinationRange) continue;
      const key = linkResolutionKey(
        occurrence,
        occurrenceSource,
        options.toSlug,
      );
      const before = key ? beforeIndex.get(key) : undefined;
      if (!before) {
        if (!key || !options.beforeAmbiguities?.has(key)) continue;
        const afterKey = linkResolutionKey(
          occurrence,
          filePath,
          options.toSlug,
        );
        const stillAmbiguous =
          afterKey !== undefined &&
          options.afterAmbiguities?.has(afterKey) === true;
        const relocationAffects =
          previousPath !== undefined &&
          occurrence.syntax !== "wikilink" &&
          occurrence.syntax !== "wiki-embed";
        if (stillAmbiguous && !relocationAffects) continue;
        conflicts.push({
          severity: "error",
          code: "link-target-ambiguous",
          path: filePath,
          message: `The link target is ambiguous around the mutation: ${occurrence.rawDestination}`,
        });
        continue;
      }
      const retarget = retargetsByFrom.get(keyOf(before));
      if (retarget && !retarget.to) {
        warnings.push({
          severity: "warning",
          code: "broken-link",
          path: filePath,
          message: `A link to deleted content remains: ${occurrence.rawDestination}`,
        });
        continue;
      }
      const target = retarget?.to ?? actualPaths.get(keyOf(before)) ?? before;
      const relocation =
        previousPath !== undefined &&
        occurrence.syntax !== "wikilink" &&
        occurrence.syntax !== "wiki-embed";
      if (!retarget && !relocation) {
        const after = key
          ? index.get(
              linkResolutionKey(occurrence, filePath, options.toSlug) ?? "",
            )
          : undefined;
        if (!after) {
          conflicts.push({
            severity: "error",
            code: "link-broken",
            path: filePath,
            message: `The link no longer resolves after the mutation: ${occurrence.rawDestination}`,
          });
          continue;
        }
        if (keyOf(after) !== keyOf(before)) {
          conflicts.push({
            severity: "error",
            code: "link-target-changed",
            path: filePath,
            message: `The link target changes without a rewrite: ${occurrence.rawDestination}`,
          });
        }
        continue;
      }
      const replacement = replacementDestination(
        occurrence.syntax,
        target,
        filePath,
        occurrence.fragment,
        options.toSlug,
      );
      if (replacement === null || replacement === occurrence.rawDestination)
        continue;
      if (!actualPaths.has(keyOf(target))) {
        conflicts.push({
          severity: "error",
          code: "link-target-missing",
          path: filePath,
          message: `The link target is missing from the mutation: ${target}`,
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

function replacementDestination(
  syntax: ReturnType<typeof extractLinkOccurrences>[number]["syntax"],
  to: string,
  sourcePath: string,
  fragment: string | undefined,
  toSlug?: (path: string) => string | undefined,
): string | null {
  if (syntax === "wikilink" || syntax === "wiki-embed")
    return toSlug?.(to) ?? to.replace(/\.md$/i, "");
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
  return `${relative
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/")}${fragment ?? ""}`;
}

function buildIndex(
  paths: readonly string[],
  keyOf: (path: string) => string,
): ReadonlyMap<string, string> {
  const candidates = new Map<string, Set<string>>();
  for (const filePath of paths) {
    for (const key of keysOf(filePath, keyOf)) {
      const values = candidates.get(key) ?? new Set<string>();
      values.add(filePath);
      candidates.set(key, values);
    }
  }
  const index = new Map<string, string>();
  for (const [key, values] of candidates) {
    if (values.size === 1) index.set(key, [...values][0] as string);
  }
  return index;
}

function buildBeforeIndex(
  files: ReadonlyMap<string, string>,
  retargets: readonly ContentLinkRetarget[],
  keyOf: (path: string) => string,
): ReadonlyMap<string, string> {
  const movedTo = new Map<string, string>();
  for (const retarget of retargets) {
    if (retarget.to) movedTo.set(keyOf(retarget.to), retarget.from);
  }
  const paths = new Set<string>();
  for (const filePath of files.keys())
    paths.add(movedTo.get(keyOf(filePath)) ?? filePath);
  for (const retarget of retargets) paths.add(retarget.from);
  return buildIndex([...paths], keyOf);
}

function contentKey(
  filePath: string,
  toSlug?: (path: string) => string | undefined,
): string {
  const normalized = filePath.replaceAll("\\", "/");
  return (
    toSlug?.(normalized) ?? normalized.replace(/\.md$/i, "")
  ).toLowerCase();
}

function keysOf(filePath: string, keyOf: (path: string) => string): string[] {
  const withoutExtension = keyOf(filePath);
  const parts = withoutExtension.split("/");
  const keys: string[] = [];
  for (let index = 0; index < parts.length; index += 1)
    keys.push(parts.slice(index).join("/").toLowerCase());
  return keys;
}
