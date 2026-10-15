import type {
  PluginDataHelper,
  PublicContentEntry,
  PublicContentView,
} from "@riebeckite/core";
import { buildNoteChangeHistory } from "./changelog.js";
import { resolveChangelogOptions } from "./options.js";
import type {
  ChangelogCommit,
  ChangelogOptions,
  NoteChangeHistory,
} from "./types.js";

export type ChangelogHistoryLoader = (
  entry: PublicContentEntry,
) => Promise<readonly ChangelogCommit[]>;

export const getChangelog: PluginDataHelper<
  {
    view: PublicContentView;
    entry: PublicContentEntry;
    loadCommits: ChangelogHistoryLoader;
    options?: ChangelogOptions;
  },
  Promise<NoteChangeHistory | null>
> = async ({ view, entry, loadCommits, options }) => {
  if (!view.findRoutableBySlug(entry.slug)) return null;
  const commits = await loadCommits(entry);
  return buildNoteChangeHistory(
    entry,
    commits,
    resolveChangelogOptions(options),
  );
};
