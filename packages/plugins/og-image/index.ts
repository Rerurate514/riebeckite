import { createHash } from "node:crypto";
import {
  type ConfigValidationIssue,
  definePlugin,
  type OutputDependency,
} from "@riebeckite/core";
import {
  type OgContent,
  type OgLayout,
  type OgPalette,
  type OgPreset,
  presetLayout,
  renderOgImage,
} from "@riebeckite/og-image";

const PLUGIN_NAME = "og-image";
const RENDERER_VERSION = "1";
const generatedPathPrefix = "/_og/";
const defaultContent: OgContent = {
  showAuthor: false,
  showSiteName: true,
  showTags: false,
};
const defaultPalette: OgPalette = {
  background: "#18212f",
  foreground: "#f8fafc",
  accent: "#67e8f9",
};

export type OgImageOptions = {
  preset?: OgPreset;
  appearance?: Partial<OgPalette>;
  content?: Partial<OgContent>;
  layout?: OgLayout;
  layoutFingerprint?: string;
};

export function ogImage(options: OgImageOptions = {}) {
  const palette = { ...defaultPalette, ...options.appearance };
  const content = { ...defaultContent, ...options.content };
  const layout = options.layout ?? presetLayout(options.preset ?? "card");
  const configurationFingerprint = hash({
    content,
    layout: options.layoutFingerprint ?? options.preset ?? "card",
    palette,
    renderer: RENDERER_VERSION,
  });

  return definePlugin({
    name: PLUGIN_NAME,
    cacheVersion: configurationFingerprint,
    options,
    validateOptions: validateOgImageOptions,
    onManifestCreated: ({ manifest }) => {
      for (const entry of manifest.publicEntries) {
        if (
          typeof entry.frontmatter.ogImage === "string" ||
          typeof entry.frontmatter.image === "string"
        ) {
          continue;
        }
        entry.frontmatter.ogImage = generatedImagePath(
          entry.title,
          entry.permalink,
          configurationFingerprint,
        );
      }
    },
    planDeferredOutputs: ({ manifest, site }) =>
      manifest.routableEntries.flatMap((entry) => {
        const path = entry.frontmatter.ogImage;
        if (
          typeof entry.frontmatter.image === "string" ||
          typeof path !== "string" ||
          !path.startsWith(generatedPathPrefix)
        ) {
          return [];
        }
        const dependencies: readonly OutputDependency[] = [
          { type: "content", slug: entry.slug },
        ];
        const fingerprint = hash({
          configurationFingerprint,
          permalink: entry.permalink,
          title: entry.title,
          path,
        });
        return [
          {
            path: path.slice(1),
            dependencies,
            fingerprint,
            generate: () =>
              renderOgImage(layout, {
                page: {
                  title: entry.title,
                  description: stringValue(entry.frontmatter.description),
                  permalink: entry.permalink,
                  language: entry.publicLocation.language,
                  kind: "article",
                  tags: entry.tags,
                  author: stringValue(entry.frontmatter.author),
                },
                site: {
                  title: site?.title ?? "",
                  description: site?.description,
                  author: site?.author,
                  baseUrl: site?.baseUrl,
                },
                palette,
                content,
              }),
          },
        ];
      }),
  });
}

export function validateOgImageOptions(
  options: OgImageOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options) return [];
  const issues: ConfigValidationIssue[] = [];
  if (
    options.preset !== undefined &&
    !["card", "minimal", "editorial"].includes(options.preset)
  ) {
    issues.push({
      path: "preset",
      message: "Expected card, minimal, or editorial.",
    });
  }
  if (options.layout && !stringValue(options.layoutFingerprint)) {
    issues.push({
      path: "layoutFingerprint",
      message: "Required when layout is provided.",
    });
  }
  for (const [name, value] of Object.entries(options.appearance ?? {})) {
    if (typeof value !== "string" || !/^#[0-9a-fA-F]{3,8}$/.test(value)) {
      issues.push({
        path: `appearance.${name}`,
        message: "Expected a hex color.",
      });
    }
  }
  return issues;
}

function generatedImagePath(
  title: string,
  permalink: string,
  configurationFingerprint: string,
): string {
  return `${generatedPathPrefix}${hash({
    configurationFingerprint,
    permalink,
    title,
  }).slice(0, 16)}.png`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
