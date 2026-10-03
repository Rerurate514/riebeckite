import {
  createStyleAsset,
  definePlugin,
  type OutputDependency,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import {
  type DailyNotesOptions,
  DEFAULT_DIRECTORY,
} from "./src/daily-notes.js";

export { default as DailyNotes } from "./components/daily-notes.js";
export type {
  DailyNote,
  DailyNotesDateFormat,
  DailyNotesOptions,
  ResolvedDailyNotesDisplay,
  ResolvedDailyNotesExtract,
} from "./src/daily-notes.js";
export {
  DEFAULT_DAILY_NOTES_DATE_FORMAT,
  DEFAULT_DAILY_NOTES_LOCALE,
  formatDailyNoteDate,
  resolveDisplayOptions,
} from "./src/daily-notes.js";
export { getDailyNotes } from "./src/daily-notes.server.js";

/**
 * Registers the Daily Notes widget. Extraction options are consumed by
 * `getDailyNotes`; the plugin wires the stylesheet and output dependencies.
 */
export function dailyNotesPlugin(
  options?: DailyNotesOptions,
): RiebeckitePlugin<DailyNotesOptions | undefined> {
  return definePlugin({
    name: "daily-notes",
    options,
    cacheVersion: "1",
    outputDependencies: resolveOutputDependencies(options),
    assets: [createStyleAsset("daily-notes")],
  });
}

function resolveOutputDependencies(
  options: DailyNotesOptions | undefined,
): readonly OutputDependency[] {
  const directory = options?.source?.directory ?? DEFAULT_DIRECTORY;
  if (directory.length === 0) return [{ type: "global" }];
  return [{ type: "folder", folder: directory }];
}
