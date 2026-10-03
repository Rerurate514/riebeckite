import type {
  ContentBuildDependency,
  ContentBuildState,
} from "./content_build_state.js";
import type { ContentChangeSet } from "./content_change_set.js";

export type AffectedContent = {
  readonly direct: ReadonlySet<string>;
  readonly dependent: ReadonlySet<string>;
};

export function determineAffectedContent(
  changeSet: ContentChangeSet,
  previousState: ContentBuildState | undefined,
  currentPaths: readonly string[],
  currentContentIndex: ReadonlyMap<string, string>,
): AffectedContent {
  const changedPaths = [
    ...changeSet.added,
    ...changeSet.changed,
    ...changeSet.removed,
  ];
  const direct = new Set(
    changedPaths.filter(isMarkdownPath).map(toDependencyId),
  );
  const dependent = new Set<string>();

  if (!previousState) {
    addAllNotes(direct, currentPaths);
    return { direct, dependent };
  }

  if (changeSet.added.length > 0 || changeSet.removed.length > 0) {
    const changedIndexKeys = findChangedIndexKeys(
      previousState.contentIndex,
      currentContentIndex,
    );
    for (const [path, entry] of Object.entries(previousState.entries)) {
      if (!isMarkdownPath(path)) continue;
      const slug = toDependencyId(path);
      if (direct.has(slug) || dependent.has(slug)) continue;
      if (!entry.linkTargets?.some((target) => changedIndexKeys.has(target))) {
        continue;
      }
      dependent.add(slug);
    }
  }

  const dependentsByDependency = buildDependentsByDependency(previousState);
  const pending = changedPaths.map(toDependency);
  const seen = new Set(pending.map(dependencyKey));
  while (pending.length > 0) {
    const changed = pending.pop();
    if (changed === undefined) continue;

    for (const slug of dependentsByDependency.get(dependencyKey(changed)) ??
      []) {
      if (direct.has(slug) || dependent.has(slug)) continue;
      dependent.add(slug);
      const dependency = { kind: "content" as const, id: slug };
      if (!seen.has(dependencyKey(dependency))) {
        seen.add(dependencyKey(dependency));
        pending.push(dependency);
      }
    }
  }

  return { direct, dependent };
}

function findChangedIndexKeys(
  previousIndex: Readonly<Record<string, string>>,
  currentIndex: ReadonlyMap<string, string>,
): Set<string> {
  const changed = new Set<string>();
  for (const [key, previousValue] of Object.entries(previousIndex)) {
    if (currentIndex.get(key) !== previousValue) changed.add(key);
  }
  for (const key of currentIndex.keys()) {
    if (!(key in previousIndex)) changed.add(key);
  }
  return changed;
}

function addAllNotes(
  target: Set<string>,
  currentPaths: readonly string[],
  exclude?: ReadonlySet<string>,
): void {
  for (const path of currentPaths) {
    if (!isMarkdownPath(path)) continue;
    const slug = toDependencyId(path);
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
function toDependencyId(path: string): string {
  return path.replace(/\.md$/, "");
}

function toDependency(path: string): ContentBuildDependency {
  return isMarkdownPath(path)
    ? { kind: "content", id: toDependencyId(path) }
    : { kind: "file", id: path.replace(/\\/g, "/") };
}

function buildDependentsByDependency(
  state: ContentBuildState,
): Map<string, Set<string>> {
  const dependents = new Map<string, Set<string>>();
  for (const [path, entry] of Object.entries(state.entries)) {
    if (!isMarkdownPath(path)) continue;
    const slug = toDependencyId(path);
    for (const dependency of entry.dependencies) {
      const key = dependencyKey(dependency);
      const values = dependents.get(key) ?? new Set<string>();
      values.add(slug);
      dependents.set(key, values);
    }
  }
  return dependents;
}

function dependencyKey(dependency: ContentBuildDependency): string {
  return `${dependency.kind}:${dependency.id}`;
}
