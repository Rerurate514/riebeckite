import type { Diagnostic } from "@riebeckite/core";
import { LineMapper } from "../location.js";
import { extractMarkdownReferences } from "../markdown_links.js";
import {
  getExtension,
  getWikilinkMatches,
  resolveLocalReference,
  resolveWikilinkTarget,
  type ScanResult,
} from "../vault.js";
import {
  type NormalizedOptions,
  type NoteLocation,
  pushDiagnostic,
} from "./shared.js";

/**
 * Checks the publish boundary: content that is published must not reference
 * content that is not. A published note that links to or embeds a
 * non-published note can leak that note's title, excerpt, or rendered body
 * into the public output (link cards, transclusion, search snippets), so it is
 * reported here regardless of how the output is assembled.
 */
export function checkPublishBoundary(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  for (const note of source.includedNotes) {
    if (!note.published) continue;
    const location: NoteLocation = {
      slug: note.slug,
      filePath: note.relativePath,
    };
    const position = new LineMapper(note.markdown);

    for (const match of getWikilinkMatches(note.markdown)) {
      const resolved = resolveWikilinkTarget(match.target, source.targetIndex);
      if (resolved?.kind !== "note") continue;

      const { line, column } = position.positionAt(match.index);
      reportBoundaryReference(
        source,
        options,
        diagnostics,
        location,
        resolved.value,
        match.embed ? "embeds" : "links to",
        line,
        column,
      );
    }

    for (const reference of extractMarkdownReferences(note.markdown)) {
      const resolved = resolveLocalReference(note.slug, reference.url);
      if (!resolved || getExtension(resolved) !== "md") continue;

      reportBoundaryReference(
        source,
        options,
        diagnostics,
        location,
        resolved.slice(0, -3),
        "links to",
        reference.line,
        reference.column,
      );
    }
  }
}

function reportBoundaryReference(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
  location: NoteLocation,
  targetSlug: string,
  verb: string,
  line: number,
  column: number,
) {
  if (targetSlug === location.slug) return;
  const target = source.noteBySlug.get(targetSlug);
  if (!target || target.published) return;

  pushDiagnostic(
    diagnostics,
    options,
    location,
    "publish-boundary",
    `published note "${location.slug}" ${verb} non-published note "${targetSlug}"`,
    targetSlug,
    "publish the target note or remove the reference from published content",
    line,
    column,
  );
}
