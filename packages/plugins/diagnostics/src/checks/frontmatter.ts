import type { Diagnostic } from "@riebeckite/core";
import { hasField } from "../frontmatter.js";
import {
  resolveLocalReference,
  resolveVaultRelative,
  type ScannedNote,
  type ScanResult,
} from "../vault.js";
import {
  type AnalysisState,
  type NormalizedOptions,
  pushDiagnostic,
} from "./shared.js";

export function checkFrontmatter(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const location = { slug: note.slug, filePath: note.relativePath };
  const values = note.fm.values;
  if (!note.fm.hasFrontmatter) {
    pushDiagnostic(
      diagnostics,
      options,
      location,
      "missing-frontmatter",
      "note has no frontmatter",
      note.slug,
      "add frontmatter with the required fields",
    );
  } else {
    for (const field of options.requiredFrontmatter) {
      if (!hasField(values, field))
        pushDiagnostic(
          diagnostics,
          options,
          location,
          "missing-frontmatter",
          `missing required frontmatter field "${field}"`,
          field,
          `add "${field}" to the frontmatter`,
        );
    }
  }
  if (values.publish === true && values.draft === true)
    pushDiagnostic(
      diagnostics,
      options,
      location,
      "publish-conflict",
      "frontmatter sets both publish: true and draft: true",
      note.slug,
      "set only one of publish or draft",
    );
  if (values.publish === true && values.private === true)
    pushDiagnostic(
      diagnostics,
      options,
      location,
      "publish-conflict",
      "frontmatter sets both publish: true and private: true",
      note.slug,
      "set only one of publish or private",
    );
  for (const field of ["image", "ogImage"]) {
    const raw = values[field];
    if (typeof raw !== "string" || !raw.trim()) continue;
    const resolved =
      resolveLocalReference(note.slug, raw) ?? resolveVaultRelative(raw);
    if (resolved && source.assetPaths.has(resolved))
      state.referencedAssets.add(resolved);
  }
}
