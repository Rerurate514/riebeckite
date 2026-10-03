import type { Diagnostic } from "@riebeckite/core";
import { getNoteTitle } from "../frontmatter.js";
import type { ScannedNote, ScanResult } from "../vault.js";
import { type NormalizedOptions, pushDiagnostic } from "./shared.js";

export function checkSlugCollisions(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const byKey = groupNotes(source.includedNotes, (note) =>
    note.slug.toLowerCase(),
  );
  for (const [key, notes] of byKey) {
    if (notes.length < 2) continue;
    const others = notes.map((note) => note.slug).join(", ");
    for (const note of notes)
      pushDiagnostic(
        diagnostics,
        options,
        { slug: note.slug, filePath: note.relativePath },
        "slug-collision",
        `slug "${note.slug}" collides with ${others} case-insensitively`,
        key,
        "rename one of the notes to avoid the collision",
      );
  }
}

export function checkDuplicateTitles(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const byTitle = groupNotes(
    source.includedNotes.filter((note) => note.published),
    (note) =>
      `${note.language ?? ""}\u0000${getNoteTitle(note.fm.values, note.slug).toLowerCase()}`,
  );
  for (const [groupKey, notes] of byTitle) {
    if (notes.length < 2) continue;
    const title = groupKey.slice(groupKey.indexOf("\u0000") + 1);
    const slugs = notes.map((note) => note.slug).join(", ");
    for (const note of notes)
      pushDiagnostic(
        diagnostics,
        options,
        { slug: note.slug, filePath: note.relativePath },
        "duplicate-title",
        `title "${title}" is used by multiple published notes: ${slugs}`,
        typeof notes[0]?.fm.values.title === "string"
          ? notes[0].fm.values.title
          : title,
        "rename the title or the note",
      );
  }
}

function groupNotes(
  notes: ScannedNote[],
  keyFor: (note: ScannedNote) => string,
) {
  const groups = new Map<string, ScannedNote[]>();
  for (const note of notes) {
    const key = keyFor(note);
    const group = groups.get(key) ?? [];
    group.push(note);
    groups.set(key, group);
  }
  return groups;
}
