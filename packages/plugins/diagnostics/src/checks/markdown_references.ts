import type { Diagnostic } from "@riebeckite/core";
import { extractMarkdownReferences } from "../markdown_links.js";
import {
  getExtension,
  isImageTarget,
  resolveLocalReference,
  type ScannedNote,
  type ScanResult,
} from "../vault.js";
import {
  type AnalysisState,
  addIncoming,
  type NormalizedOptions,
  pushDiagnostic,
} from "./shared.js";

export function checkMarkdownReferences(
  note: ScannedNote,
  source: ScanResult,
  state: AnalysisState,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  const location = { slug: note.slug, filePath: note.relativePath };
  for (const reference of extractMarkdownReferences(note.markdown)) {
    const resolved = resolveLocalReference(note.slug, reference.url);
    if (!resolved) continue;
    const extension = getExtension(resolved);

    if (reference.kind === "image") {
      if (source.assetPaths.has(resolved) || source.filePaths.has(resolved))
        state.referencedAssets.add(resolved);
      else
        pushDiagnostic(
          diagnostics,
          options,
          location,
          "broken-image",
          `image "${reference.url}" does not exist`,
          reference.url,
          "fix the image path or add the image to the vault",
          reference.line,
          reference.column,
        );
      continue;
    }
    if (extension === "md") {
      const targetSlug = resolved.slice(0, -3);
      if (source.noteSlugs.has(targetSlug)) {
        if (targetSlug !== note.slug) addIncoming(state, targetSlug, note.slug);
      } else if (source.filePaths.has(resolved)) {
        pushDiagnostic(
          diagnostics,
          options,
          location,
          "broken-link",
          `link "${reference.url}" points to an excluded note that will not be published`,
          reference.url,
          "link to a published note or remove the link",
          reference.line,
          reference.column,
        );
      } else {
        pushDiagnostic(
          diagnostics,
          options,
          location,
          "broken-link",
          `link "${reference.url}" points to a missing note`,
          reference.url,
          "fix the link to an existing note",
          reference.line,
          reference.column,
        );
      }
      continue;
    }
    if (isImageTarget(resolved)) {
      if (source.assetPaths.has(resolved)) state.referencedAssets.add(resolved);
      else
        pushDiagnostic(
          diagnostics,
          options,
          location,
          "broken-image",
          `image link "${reference.url}" does not exist`,
          reference.url,
          "fix the image path or add the image to the vault",
          reference.line,
          reference.column,
        );
      continue;
    }
    if (!source.filePaths.has(resolved))
      pushDiagnostic(
        diagnostics,
        options,
        location,
        "broken-link",
        `link "${reference.url}" points to a missing file`,
        reference.url,
        "fix the link to an existing file",
        reference.line,
        reference.column,
      );
  }
}
