import type { ContentBuildState } from "./content_build_state";
import type { ContentChangeSet } from "./content_change_set";

export type AffectedContent = {
  readonly direct: ReadonlySet<string>;
  readonly dependent: ReadonlySet<string>;
};

export function determineAffectedContent(
  changeSet: ContentChangeSet,
  previousState: ContentBuildState | undefined,
  currentPaths: readonly string[],
): AffectedContent {
  const direct = new Set(
    [...changeSet.added, ...changeSet.changed, ...changeSet.removed]
      .filter(isMarkdownPath)
      .map(toSlug),
  );

  if (hasNonMarkdownChanges(changeSet)) {
    for (const path of currentPaths) {
      if (isMarkdownPath(path)) direct.add(toSlug(path));
    }
  }

  const dependent = new Set<string>();
  if (!previousState) return { direct, dependent };

  const pending = [...direct];
  while (pending.length > 0) {
    const changed = pending.pop();
    if (!changed) continue;

    for (const [path, entry] of Object.entries(previousState.entries)) {
      const slug = toSlug(path);
      if (!isMarkdownPath(path) || direct.has(slug) || dependent.has(slug)) {
        continue;
      }
      if (!entry.dependencies.includes(changed)) continue;

      dependent.add(slug);
      pending.push(slug);
    }
  }

  return { direct, dependent };
}

function hasNonMarkdownChanges(changeSet: ContentChangeSet): boolean {
  return [...changeSet.added, ...changeSet.changed, ...changeSet.removed].some(
    (path) => !isMarkdownPath(path),
  );
}

function isMarkdownPath(path: string): boolean {
  return path.endsWith(".md");
}

function toSlug(path: string): string {
  return path.replace(/\.md$/, "");
}
