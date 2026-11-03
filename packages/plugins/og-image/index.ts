import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
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
import { buildSync } from "esbuild";

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
  layout?: OgLayout | string;
  layoutFingerprint?: string;
};

export function ogImage(options: OgImageOptions = {}) {
  const customLayout =
    typeof options.layout === "string"
      ? compileLayout(options.layout)
      : undefined;
  const palette = { ...defaultPalette, ...options.appearance };
  const content = { ...defaultContent, ...options.content };
  const layout =
    typeof options.layout === "function"
      ? options.layout
      : (customLayout?.load ?? presetLayout(options.preset ?? "card"));
  const configurationFingerprint = hash({
    content,
    layout:
      customLayout?.fingerprint ??
      options.layoutFingerprint ??
      options.preset ??
      "card",
    palette,
    renderer: RENDERER_VERSION,
  });

  return definePlugin({
    name: PLUGIN_NAME,
    cacheVersion: configurationFingerprint,
    options,
    validateOptions: validateOgImageOptions,
    inspector: {
      apiVersion: 1,
      tabs: [
        {
          id: "og-image",
          title: { en: "OG images", ja: "OG画像" },
          description: {
            en: "Static Open Graph image configuration.",
            ja: "静的 Open Graph 画像の設定です。",
          },
          collect: () => ({
            kind: "key-value",
            items: [
              {
                key: { en: "Preset", ja: "プリセット" },
                value: options.preset ?? "card",
              },
              {
                key: { en: "Layout", ja: "レイアウト" },
                value:
                  typeof options.layout === "string"
                    ? options.layout
                    : typeof options.layout === "function"
                      ? "SVG function"
                      : "preset",
              },
              {
                key: { en: "Output prefix", ja: "出力プレフィックス" },
                value: generatedPathPrefix,
              },
              {
                key: { en: "Palette", ja: "配色" },
                value: palette,
              },
            ],
          }),
        },
      ],
    },
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
            generate: async () =>
              renderOgImage(await layout, {
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
  if (
    typeof options.layout === "function" &&
    !stringValue(options.layoutFingerprint)
  ) {
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

function compileLayout(path: string): {
  fingerprint: string;
  load: Promise<OgLayout>;
} {
  const entryPoint = resolve(path);
  const result = buildSync({
    absWorkingDir: process.cwd(),
    bundle: true,
    entryPoints: [entryPoint],
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "hono/jsx",
    metafile: true,
    packages: "external",
    platform: "node",
    write: false,
  });
  const sourceFingerprint = hash(
    Object.keys(result.metafile.inputs)
      .sort()
      .map((input) => [input, readFileSync(resolve(input), "utf8")]),
  );
  const outputPath = resolve(
    dirname(entryPoint),
    ".riebeckite",
    "og-layouts",
    `${sourceFingerprint}.mjs`,
  );
  mkdirSync(resolve(outputPath, ".."), { recursive: true });
  writeFileSync(outputPath, result.outputFiles[0]?.text ?? "", "utf8");
  const load = import(
    `${pathToFileURL(outputPath).href}?v=${sourceFingerprint}`
  ).then((module) => {
    if (typeof module.default !== "function") {
      throw new Error(`OG layout "${path}" must have a default export.`);
    }
    return module.default as OgLayout;
  });
  return { fingerprint: sourceFingerprint, load };
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
