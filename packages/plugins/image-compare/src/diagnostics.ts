import type { ContentManifest, Diagnostic } from "@riebeckite/core";
import { IMAGE_COMPARE_ERROR_ATTRIBUTE } from "./compare.js";

const ERROR_PATTERN = new RegExp(
  `${IMAGE_COMPARE_ERROR_ATTRIBUTE}="([^"]*)"`,
  "g",
);

export function collectImageCompareDiagnostics(
  manifest: Pick<ContentManifest, "entries">,
  diagnostics: Diagnostic[],
): void {
  for (const entry of manifest.entries) {
    for (const match of entry.html.matchAll(ERROR_PATTERN)) {
      diagnostics.push({
        code: "image-compare-invalid",
        severity: "error",
        pluginName: "image-compare",
        slug: entry.slug,
        message: `Image comparison block in \`${entry.slug}\` ${decodeURIComponent(match[1])}`,
      });
    }
  }
}
