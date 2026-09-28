import {
  ensureProperty,
  getStringProperty,
  hasProperty,
  visitElements,
} from "./hast.js";
import type { ResponsiveImageOptions } from "./options.js";
import { resolveResponsiveImageOptions } from "./options.js";
import type { HastFile, HastNode } from "./types.js";

export const RESPONSIVE_IMAGE_MARKER = "data-responsive-image";
export const RESPONSIVE_IMAGE_SOURCE = "@riebeckite/plugin-responsive-image";

const MARKER_PROPERTY = "dataResponsiveImage";

/**
 * HTML-pipeline pass: normalise the responsive attributes on every `<img>` and
 * mark it so the manifest pass can wrap it once the asset set is known.
 */
export function rehypeResponsiveImage(options: ResponsiveImageOptions = {}) {
  const resolved = resolveResponsiveImageOptions(options);

  return (tree: HastNode, file: unknown): void => {
    visitElements(tree, (node) => {
      if (node.tagName !== "img") return;
      if (hasProperty(node, MARKER_PROPERTY)) return;

      const src = getStringProperty(node, "src");
      if (!src || src.trim() === "") {
        warnMalformed(
          file as HastFile | undefined,
          'An <img> element is missing a usable "src".',
        );
      }

      if (resolved.lazy) ensureProperty(node, "loading", "lazy");
      if (resolved.decoding) ensureProperty(node, "decoding", "async");
      ensureProperty(node, "sizes", resolved.sizes);

      if (!node.properties) node.properties = {};
      node.properties[MARKER_PROPERTY] = "";
    });
  };
}

function warnMalformed(file: HastFile | undefined, message: string): void {
  if (typeof file?.message !== "function") return;
  file.message(message, { source: RESPONSIVE_IMAGE_SOURCE });
}
