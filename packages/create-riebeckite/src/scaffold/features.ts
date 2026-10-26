import {
  type ScaffoldPluginSpec,
  type ScaffoldPreset,
  validateScaffoldPreset,
} from "./presets.js";

export type ScaffoldFeatureName = "knowledge" | "diagrams" | "media" | "i18n";

export type ScaffoldFeaturePack = {
  readonly name: ScaffoldFeatureName;
  readonly description: string;
  readonly plugins: readonly ScaffoldPluginSpec[];
};

const feature = (
  package_: string,
  factory: string,
  options?: string,
): ScaffoldPluginSpec => ({ package: package_, factory, options });

const featurePacks: Readonly<Record<ScaffoldFeatureName, ScaffoldFeaturePack>> =
  {
    knowledge: {
      name: "knowledge",
      description: "Link previews and a local graph for connected notes.",
      plugins: [
        feature("@riebeckite/plugin-hover-preview", "hoverPreview"),
        feature("@riebeckite/plugin-local-graph", "localGraph"),
      ],
    },
    diagrams: {
      name: "diagrams",
      description: "Mermaid and Graphviz diagrams in Markdown.",
      plugins: [
        feature("@riebeckite/plugin-mermaid-pele", "mermaidPele"),
        feature("@riebeckite/plugin-graphviz", "graphviz"),
      ],
    },
    media: {
      name: "media",
      description: "Embedded audio and video, responsive images, and lightbox.",
      plugins: [
        feature("@riebeckite/plugin-media", "media"),
        feature("@riebeckite/plugin-responsive-image", "responsiveImage"),
        feature("@riebeckite/plugin-lightbox", "lightbox"),
      ],
    },
    i18n: {
      name: "i18n",
      description:
        "English and Japanese localization support for content you add.",
      plugins: [
        feature(
          "@riebeckite/plugin-l10n",
          "l10n",
          '{ defaultLang: "en", languages: ["en", "ja"] }',
        ),
      ],
    },
  };

export const SCAFFOLD_FEATURE_NAMES: readonly ScaffoldFeatureName[] = [
  "knowledge",
  "diagrams",
  "media",
  "i18n",
];

export const SCAFFOLD_FEATURE_PACKS: readonly ScaffoldFeaturePack[] =
  SCAFFOLD_FEATURE_NAMES.map((name) => featurePacks[name]);

export function isScaffoldFeatureName(
  value: string,
): value is ScaffoldFeatureName {
  return (SCAFFOLD_FEATURE_NAMES as readonly string[]).includes(value);
}

export function parseScaffoldFeatures(
  value: string,
): readonly ScaffoldFeatureName[] {
  if (value === "none") return [];
  const names = value.split(",");
  if (
    names.length === 0 ||
    names.some((name) => !isScaffoldFeatureName(name))
  ) {
    throw new Error(
      `Unknown feature: ${names.find((name) => !isScaffoldFeatureName(name)) ?? "(missing)"}. Available features: ${SCAFFOLD_FEATURE_NAMES.join(", ")}.`,
    );
  }
  if (new Set(names).size !== names.length) {
    throw new Error("Features must not be repeated.");
  }
  return names as ScaffoldFeatureName[];
}

export function composeScaffoldPreset(
  preset: ScaffoldPreset,
  features: readonly ScaffoldFeatureName[],
): ScaffoldPreset {
  const selected = features.map((name) => featurePacks[name]);
  const composed: ScaffoldPreset = {
    ...preset,
    languages: features.includes("i18n") ? ["en", "ja"] : preset.languages,
    plugins: [...preset.plugins, ...selected.flatMap((pack) => pack.plugins)],
  };
  try {
    validateScaffoldPreset(composed);
  } catch (error) {
    throw new Error(
      `Feature packs cannot be combined with preset "${preset.name}": ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return composed;
}
