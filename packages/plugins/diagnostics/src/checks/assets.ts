import type { Diagnostic } from "@riebeckite/core";
import type { ScanResult } from "../vault.js";
import {
  type AnalysisState,
  type NormalizedOptions,
  pushDiagnostic,
} from "./shared.js";

export function checkUnusedAssets(
  source: ScanResult,
  state: AnalysisState,
  options: NormalizedOptions,
  diagnostics: Diagnostic[],
) {
  if (!options.reportUnusedAssets) return;
  for (const asset of source.assets) {
    if (!state.referencedAssets.has(asset.relativePath))
      pushDiagnostic(
        diagnostics,
        options,
        { filePath: asset.relativePath },
        "unused-asset",
        `image "${asset.relativePath}" is never referenced by any note`,
        asset.relativePath,
        "reference the image from a note or remove it",
      );
  }
}
