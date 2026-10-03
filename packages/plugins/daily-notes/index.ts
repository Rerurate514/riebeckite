import {
  createStyleAsset,
  definePlugin,
  type RiebeckitePlugin,
} from "@riebeckite/core";
import type { DailyNotesOptions } from "./src/daily-notes.js";

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
 * `getDailyNotes`; the plugin itself only wires the stylesheet.
 */
export function dailyNotesPlugin(
  options?: DailyNotesOptions,
): RiebeckitePlugin<DailyNotesOptions | undefined> {
  return definePlugin({
    name: "daily-notes",
    options,
    cacheVersion: "1",
    assets: [createStyleAsset("daily-notes")],
  });
}
