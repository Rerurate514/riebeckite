export type PluginFeatureCategory = "primary" | "support";

export type PluginFeature = {
  readonly id: PluginFeatureId;
  readonly name: string;
  readonly description: string;
  readonly category: PluginFeatureCategory;
  readonly recipe: string;
  readonly files: readonly string[];
  readonly compatibleWith: readonly PluginFeatureId[];
  readonly requires: readonly PluginFeatureId[];
  readonly conflictsWith: readonly PluginFeatureId[];
  readonly configuration: readonly string[];
};

export const PLUGIN_FEATURE_IDS = [
  "transform",
  "renderers",
  "content-hooks",
  "urls",
  "content-graph",
  "pages",
  "components",
  "assets-and-client-entries",
  "endpoints",
  "seo",
  "generated-files",
  "diagnostics",
  "cache",
  "dependencies-and-options",
  "logging-and-tracing",
] as const;

export type PluginFeatureId = (typeof PLUGIN_FEATURE_IDS)[number];

const primary = new Set<PluginFeatureId>([
  "transform",
  "renderers",
  "content-hooks",
  "urls",
  "content-graph",
  "pages",
  "components",
  "assets-and-client-entries",
  "endpoints",
  "seo",
  "generated-files",
]);

const descriptions: Readonly<Record<PluginFeatureId, string>> = {
  transform: "Adds a safe HTML pipeline transform.",
  renderers: "Renders matching embedded content with escaped HTML.",
  "content-hooks": "Reports source-content issues during loading.",
  urls: "Adds legacy redirects without replacing canonical locations.",
  "content-graph": "Adds links declared in frontmatter to the graph.",
  pages: "Adds a public index page with output dependencies.",
  components: "Exports a typed component for site layouts to import.",
  "assets-and-client-entries": "Registers explicit style and browser entries.",
  endpoints: "Adds a public JSON endpoint.",
  seo: "Adds public-entry metadata without exposing unpublished content.",
  "generated-files": "Plans a generated file with a global dependency.",
  diagnostics: "Inspects generated HTML for a concrete diagnostic.",
  cache: "Uses the plugin cache with an explicit version.",
  "dependencies-and-options": "Validates options and declares capabilities.",
  "logging-and-tracing": "Uses the lifecycle logger and tracer.",
};

const recipes: Readonly<Record<PluginFeatureId, string>> = {
  transform: "docs/docs/plugins/writing-a-plugin.md",
  renderers: "docs/docs/plugins/writing-a-plugin.md",
  "content-hooks": "docs/docs/plugins/diagnostics.md",
  urls: "docs/docs/plugins/rename.md",
  "content-graph": "docs/docs/plugins/backlinks.md",
  pages: "docs/docs/plugins/writing-a-plugin.md",
  components: "docs/docs/plugins/writing-a-plugin.md",
  "assets-and-client-entries": "docs/docs/plugins/writing-a-plugin.md",
  endpoints: "docs/docs/plugins/writing-a-plugin.md",
  seo: "docs/docs/plugins/seo.md",
  "generated-files": "docs/docs/plugins/writing-a-plugin.md",
  diagnostics: "docs/docs/plugins/diagnostics.md",
  cache: "docs/docs/plugins/writing-a-plugin.md",
  "dependencies-and-options": "docs/docs/plugins/writing-a-plugin.md",
  "logging-and-tracing": "docs/docs/plugins/writing-a-plugin.md",
};

export const pluginFeatureRegistry: Readonly<
  Record<PluginFeatureId, PluginFeature>
> = Object.fromEntries(
  PLUGIN_FEATURE_IDS.map((id) => [
    id,
    {
      id,
      name: id.replaceAll("-", " "),
      description: descriptions[id],
      category: primary.has(id) ? "primary" : "support",
      recipe: recipes[id],
      files:
        id === "assets-and-client-entries"
          ? ["index.ts", "style.css", "client.ts"]
          : id === "components"
            ? ["index.ts", "component.tsx"]
            : ["index.ts"],
      compatibleWith: PLUGIN_FEATURE_IDS.filter((feature) => feature !== id),
      requires: [],
      conflictsWith: [],
      configuration:
        id === "dependencies-and-options"
          ? ["Pass the generated options object when registering the plugin."]
          : id === "assets-and-client-entries"
            ? [
                "Keep client configuration explicitly public and JSON-serializable.",
              ]
            : [],
    },
  ]),
) as Record<PluginFeatureId, PluginFeature>;

export function isPluginFeatureId(value: string): value is PluginFeatureId {
  return PLUGIN_FEATURE_IDS.includes(value as PluginFeatureId);
}

export function parsePluginFeatures(value: string): readonly PluginFeatureId[] {
  const values = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (values.length === 0)
    throw new Error("--features requires at least one feature.");
  const invalid = values.filter((item) => !isPluginFeatureId(item));
  if (invalid.length > 0) {
    throw new Error(
      `Unknown plugin feature: ${invalid.join(", ")}. Available features: ${PLUGIN_FEATURE_IDS.join(", ")}.`,
    );
  }
  return [...new Set(values)] as PluginFeatureId[];
}
