import type { Diagnostic, PostFrontmatter } from "@riebeckite/core";
import { resolveContentStableId } from "@riebeckite/core";
import type { ScannedNote, ScanResult } from "../vault.js";
import { type NormalizedOptions, pushDiagnostic } from "./shared.js";

/**
 * Checks stable content ID integrity.
 *
 * Stable content IDs come from the optional source-authored `id` frontmatter
 * field. They are the identity key for per-content consumers such as analytics
 * page views, so duplicates silently merge per-content metrics.
 * This check is intentionally generic: it validates the content-model invariant
 * without knowing which plugin consumes the ID.
 */
export function checkContentIdIntegrity(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const publishedById = new Map<string, ScannedNote[]>();

  for (const note of source.includedNotes) {
    if (!note.published) continue;

    let id: string | undefined;
    try {
      id = resolveContentStableId(note.fm.values as PostFrontmatter);
    } catch (error) {
      pushDiagnostic(
        diagnostics,
        options,
        { slug: note.slug, filePath: note.relativePath },
        "invalid-content-id",
        `invalid content id frontmatter: ${toErrorMessage(error)}`,
        undefined,
        'set a unique, trimmed "id" value',
      );
      continue;
    }
    if (!id) continue;

    const group = publishedById.get(id) ?? [];
    group.push(note);
    publishedById.set(id, group);
  }

  for (const [id, notes] of publishedById) {
    if (notes.length < 2) continue;
    const slugs = notes.map((note) => note.slug).join(", ");
    for (const note of notes) {
      pushDiagnostic(
        diagnostics,
        options,
        { slug: note.slug, filePath: note.relativePath },
        "duplicate-content-id",
        `content id "${id}" is used by multiple published notes: ${slugs}`,
        id,
        'give each note a unique "id" frontmatter value',
      );
    }
  }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
