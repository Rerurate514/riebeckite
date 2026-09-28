import type {
  ContentBuildState,
  FingerprintedContentEntry,
} from "./content_build_state.js";

export type ContentChangeSet = {
  readonly added: readonly string[];
  readonly changed: readonly string[];
  readonly removed: readonly string[];
  readonly unchanged: readonly string[];
};

export function diffContentEntries(
  previous: ContentBuildState,
  current: readonly FingerprintedContentEntry[],
): ContentChangeSet {
  const currentFingerprints = new Map(
    current.map(({ entry, fingerprint }) => [entry.path, fingerprint]),
  );
  const added: string[] = [];
  const changed: string[] = [];
  const unchanged: string[] = [];

  for (const [path, fingerprint] of currentFingerprints) {
    const previousEntry = previous.entries[path];
    if (!previousEntry) {
      added.push(path);
    } else if (previousEntry.fingerprint !== fingerprint) {
      changed.push(path);
    } else {
      unchanged.push(path);
    }
  }

  const removed = Object.keys(previous.entries).filter(
    (path) => !currentFingerprints.has(path),
  );
  return sortChangeSet({ added, changed, removed, unchanged });
}

export function allContentChanged(
  entries: readonly FingerprintedContentEntry[],
): ContentChangeSet {
  return sortChangeSet({
    added: entries.map(({ entry }) => entry.path),
    changed: [],
    removed: [],
    unchanged: [],
  });
}

export function hasContentChanges(changeSet: ContentChangeSet): boolean {
  return (
    changeSet.added.length > 0 ||
    changeSet.changed.length > 0 ||
    changeSet.removed.length > 0
  );
}

function sortChangeSet(changeSet: ContentChangeSet): ContentChangeSet {
  return {
    added: [...changeSet.added].sort(),
    changed: [...changeSet.changed].sort(),
    removed: [...changeSet.removed].sort(),
    unchanged: [...changeSet.unchanged].sort(),
  };
}
