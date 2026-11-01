import {
  type ContentManifest,
  type Diagnostic,
  resolveContentAssetUrl,
} from "@riebeckite/core";
import { parseImageCompare } from "./parse.js";
import {
  createImageComparePlaceholderPattern,
  decodeImageCompareSource,
  IMAGE_COMPARE_ATTRIBUTE,
} from "./placeholder.js";
import { renderImageCompare, renderImageCompareError } from "./render.js";

export function createImageCompareRuntime() {
  return {
    resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void {
      for (const entry of manifest.entries) {
        if (!entry.html.includes(IMAGE_COMPARE_ATTRIBUTE)) continue;

        const pattern = createImageComparePlaceholderPattern();
        entry.html = entry.html.replace(pattern, (_match, encoded: string) =>
          resolveBlock(entry.slug, encoded, diagnostics),
        );
      }
    },
  };
}

function resolveBlock(
  slug: string,
  encoded: string,
  diagnostics: Diagnostic[],
): string {
  let source: string;
  try {
    source = decodeImageCompareSource(encoded);
  } catch (error) {
    return fail(
      slug,
      `Image comparison block in \`${slug}\` could not be decoded (${formatError(error)}).`,
      diagnostics,
    );
  }

  const parsed = parseImageCompare(source);
  if (parsed.ok === false) {
    return fail(
      slug,
      `Image comparison block in \`${slug}\` ${parsed.reason}`,
      diagnostics,
    );
  }

  const before = resolveContentAssetUrl(parsed.spec.before, slug);
  const after = resolveContentAssetUrl(parsed.spec.after, slug);
  if (!before || !after) {
    const invalid = !before ? parsed.spec.before : parsed.spec.after;
    return fail(
      slug,
      `Image comparison block in \`${slug}\` references an unsupported image: "${invalid}".`,
      diagnostics,
    );
  }

  return renderImageCompare({
    ...parsed.spec,
    before: before.url,
    after: after.url,
  });
}

function fail(
  slug: string,
  message: string,
  diagnostics: Diagnostic[],
): string {
  diagnostics.push({
    code: "image-compare-invalid",
    severity: "error",
    pluginName: "image-compare",
    slug,
    message,
  });
  return renderImageCompareError(message);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
