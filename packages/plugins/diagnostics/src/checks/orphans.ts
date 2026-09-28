import type { Diagnostic } from "@riebeckite/core";
import type { ScanResult } from "../vault.js";
import {
  type AnalysisState,
  type NormalizedOptions,
  pushDiagnostic,
} from "./shared.js";

export function checkOrphans(
  source: ScanResult,
  state: AnalysisState,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  if (!options.reportOrphans) return;
  for (const note of source.includedNotes) {
    if (
      !note.published ||
      note.slug === "index" ||
      (state.incoming.get(note.slug)?.size ?? 0) > 0
    )
      continue;
    pushDiagnostic(
      diagnostics,
      options,
      { slug: note.slug, filePath: note.relativePath },
      "orphan-note",
      "published note has no incoming links",
      note.slug,
      "link to this note from another note",
    );
  }
}
