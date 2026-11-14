import type { DailyNote } from "./daily_notes_types.js";

export function compareDailyNotes(a: DailyNote, b: DailyNote): number {
  if (a.date !== b.date) {
    if (a.date.length === 0) return 1;
    if (b.date.length === 0) return -1;
    return a.date < b.date ? 1 : -1;
  }

  if (a.slug === b.slug) return 0;
  return a.slug < b.slug ? -1 : 1;
}
