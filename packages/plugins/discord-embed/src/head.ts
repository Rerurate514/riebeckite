import type {
  ContentManifestEntry,
  Diagnostic,
  PluginHeadTag,
} from "@riebeckite/core";
import { HEX_COLOR_PATTERN } from "./options.js";
import type { ResolvedDiscordEmbedOptions } from "./types.js";

const COLOR_FIELDS = ["theme_color", "themeColor", "discord_color"] as const;
const IMAGE_FIELDS = ["ogImage", "image"] as const;
const WIDTH_FIELDS = ["ogImageWidth", "imageWidth"] as const;
const HEIGHT_FIELDS = ["ogImageHeight", "imageHeight"] as const;

/**
 * Builds the Discord-specific head tags for one entry.
 *
 * The color is always emitted. The OpenGraph image tags are only emitted when
 * the entry actually has an image, so the metadata stays consistent with the
 * `og:image` the `seo` plugin emits.
 */
export function buildDiscordHeadTags(
  entry: ContentManifestEntry,
  options: ResolvedDiscordEmbedOptions,
  diagnostics: Diagnostic[],
): PluginHeadTag[] {
  const tags: PluginHeadTag[] = [];
  const color = resolveColor(entry, options, diagnostics);

  tags.push({ tag: "meta", attrs: { name: "theme-color", content: color } });

  const image = readFirstString(entry, IMAGE_FIELDS);
  if (image !== null) {
    if (options.imageAlt) {
      const alt = entry.title.trim() || entry.slug;
      tags.push({
        tag: "meta",
        attrs: { property: "og:image:alt", content: alt },
      });
    }
    if (options.imageDimensions) {
      const width = readFirstNumber(entry, WIDTH_FIELDS);
      const height = readFirstNumber(entry, HEIGHT_FIELDS);
      if (width !== null) {
        tags.push({
          tag: "meta",
          attrs: { property: "og:image:width", content: String(width) },
        });
      }
      if (height !== null) {
        tags.push({
          tag: "meta",
          attrs: { property: "og:image:height", content: String(height) },
        });
      }
    }
  }

  return tags;
}

function resolveColor(
  entry: ContentManifestEntry,
  options: ResolvedDiscordEmbedOptions,
  diagnostics: Diagnostic[],
): string {
  const requested = readFirstString(entry, COLOR_FIELDS);
  if (requested === null) return options.themeColor;

  if (HEX_COLOR_PATTERN.test(requested)) return requested;

  diagnostics.push({
    code: "discord-embed-invalid-color",
    severity: "warning",
    pluginName: "discord-embed",
    slug: entry.slug,
    message: `Invalid Discord embed color "${requested}" was ignored.`,
    suggestion: `Use a hex color such as "#5865F2". Fell back to "${options.themeColor}".`,
  });
  return options.themeColor;
}

function readFirstString(
  entry: ContentManifestEntry,
  fields: readonly string[],
): string | null {
  for (const field of fields) {
    const value = entry.frontmatter[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readFirstNumber(
  entry: ContentManifestEntry,
  fields: readonly string[],
): number | null {
  for (const field of fields) {
    const value = entry.frontmatter[field];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}
