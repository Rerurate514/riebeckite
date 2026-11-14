import type { GardenExplorerNote } from "../src/garden-explorer.js";

export type MobilePanel = "graph" | "explorer" | "details";

export function getRelatedNotes(
  selectedNote: GardenExplorerNote,
  notes: GardenExplorerNote[],
): GardenExplorerNote[] {
  const directSlugs = new Set([
    ...selectedNote.outgoing,
    ...selectedNote.backlinks,
  ]);
  const selectedTags = new Set(selectedNote.tags);

  return notes
    .filter((note) => note.slug !== selectedNote.slug)
    .map((note) => ({
      note,
      score:
        (directSlugs.has(note.slug) ? 8 : 0) +
        note.tags.filter((tag) => selectedTags.has(tag)).length * 3,
    }))
    .filter((item) => item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score || a.note.title.localeCompare(b.note.title, "ja"),
    )
    .slice(0, 8)
    .map((item) => item.note);
}

export function panelClass(
  panel: MobilePanel,
  activePanel: MobilePanel,
): string {
  return `rr-garden-explorer__panel rr-garden-explorer__panel--${panel}${
    panel === activePanel ? " rr-garden-explorer__panel--active" : ""
  }`;
}

export function quoteQuery(value: string): string {
  return /[\s"]/u.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}
