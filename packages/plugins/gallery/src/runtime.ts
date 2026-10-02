import type { ContentManifest, Diagnostic } from "@riebeckite/core";
import type { ResolvedGalleryOptions } from "./options.js";
import { parseGallery } from "./parse.js";
import {
  createGalleryPlaceholderPattern,
  decodeGallerySource,
  GALLERY_ATTRIBUTE,
} from "./placeholder.js";
import { renderGallery, renderGalleryError } from "./render.js";

export type GalleryRuntime = {
  /** Replaces every gallery placeholder in the manifest with rendered output. */
  resolve(manifest: ContentManifest, diagnostics: Diagnostic[]): void;
};

export function createGalleryRuntime(
  options: ResolvedGalleryOptions,
): GalleryRuntime {
  return {
    resolve(manifest, diagnostics) {
      for (const entry of manifest.entries) {
        if (!entry.html.includes(GALLERY_ATTRIBUTE)) continue;

        const pattern = createGalleryPlaceholderPattern();
        let replaced = false;
        const html = entry.html.replace(pattern, (_match, encoded: string) => {
          replaced = true;
          return resolveBlock(entry.slug, encoded, options, diagnostics);
        });
        if (!replaced) continue;

        entry.html = html;
      }
    },
  };
}

function resolveBlock(
  slug: string,
  encoded: string,
  options: ResolvedGalleryOptions,
  diagnostics: Diagnostic[],
): string {
  let source: string;
  try {
    source = decodeGallerySource(encoded);
  } catch (error) {
    const message = `Gallery block in \`${slug}\` could not be decoded (${formatError(error)}).`;
    diagnostics.push(errorDiagnostic(slug, message));
    return renderGalleryError(message);
  }

  const parsed = parseGallery(source, options);
  if (parsed.ok === false) {
    const message = `Gallery block in \`${slug}\` ${parsed.reason}`;
    diagnostics.push(errorDiagnostic(slug, message));
    return renderGalleryError(message);
  }

  for (const warning of parsed.warnings) {
    diagnostics.push({
      code: warning.code,
      severity: "warning",
      pluginName: "gallery",
      slug,
      message: warning.message,
    });
  }

  return renderGallery(parsed.spec);
}

function errorDiagnostic(slug: string, message: string): Diagnostic {
  return {
    code: "gallery-invalid",
    severity: "error",
    pluginName: "gallery",
    slug,
    message,
  };
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
