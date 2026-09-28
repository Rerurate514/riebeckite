import type { Diagnostic } from "@riebeckite/core";
import type { ScanResult } from "../vault.js";
import { type NormalizedOptions, pushDiagnostic } from "./shared.js";

export function checkExcludedPublic(
  source: ScanResult,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  for (const note of source.excludedNotes) {
    if (note.fm.values.publish === true)
      pushDiagnostic(
        diagnostics,
        options,
        { slug: note.slug, filePath: note.relativePath },
        "excluded-public",
        `excluded note "${note.slug}" is marked publish: true`,
        note.slug,
        "unset publish or move the note outside of the excluded directory",
      );
  }
}
