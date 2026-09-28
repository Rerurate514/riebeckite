import type { ContentBuildState } from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";

export type AffectedContent = {
  readonly direct: ReadonlySet<string>;
  readonly dependent: ReadonlySet<string>;
};

export function determineAffectedContent(
  changeSet: ContentChangeSet,
  previousState: ContentBuildState | undefined,
  currentPaths: readonly string[],
): AffectedContent {
  const changedPaths = [
    ...changeSet.added,
    ...changeSet.changed,
    ...changeSet.removed,
  ];
  const direct = new Set(
    changedPaths.filter(isMarkdownPath).map(toDependencyKey),
  );
  const dependent = new Set<string>();

  if (!previousState) {
    addAllNotes(direct, currentPaths);
    return { direct, dependent };
  }

  // Added/removed entries change the content index used to resolve links
  // (aliases, extension fallbacks, same-stem collisions). Which notes resolve
  // differently cannot be derived from the previous dependency graph, so fall
  // back to regenerating every note.
  if (changeSet.added.length > 0 || changeSet.removed.length > 0) {
    addAllNotes(dependent, currentPaths, direct);
  }

  // Propagate through the recorded dependency graph. A note depends on the
  // notes it links to (their resolved URL/permalink) and on the assets it
  // references (attachment metadata such as file size), so a changed
  // dependency invalidates the dependent note and, transitively, its own
  // dependents.
  const pending = changedPaths.map(toDependencyKey);
  const seen = new Set(pending);
  while (pending.length > 0) {
    const changed = pending.pop();
    if (changed === undefined) continue;

    for (const [path, entry] of Object.entries(previousState.entries)) {
      if (!isMarkdownPath(path)) continue;
      const slug = toDependencyKey(path);
      if (direct.has(slug) || dependent.has(slug)) continue;
      if (!entry.dependencies.includes(changed)) continue;

      dependent.add(slug);
      if (!seen.has(slug)) {
        seen.add(slug);
        pending.push(slug);
      }
    }
  }

  return { direct, dependent };
}

function addAllNotes(
  target: Set<string>,
  currentPaths: readonly string[],
  exclude?: ReadonlySet<string>,
): void {
  for (const path of currentPaths) {
    if (!isMarkdownPath(path)) continue;
    const slug = toDependencyKey(path);
    if (exclude?.has(slug)) continue;
    target.add(slug);
  }
}

function isMarkdownPath(path: string): boolean {
  return path.endsWith(".md");
}

/**
 * Dependency keys are note slugs (path without the `.md` extension) and asset
 * paths. Change set entries are source paths, so normalize both to compare.
 */
function toDependencyKey(path: string): string {
  return path.replace(/\.md$/, "");
}
