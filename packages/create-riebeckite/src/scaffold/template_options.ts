import type {
  ScaffoldOptionContext,
  ScaffoldOptions,
  ScaffoldOptionValue,
  ScaffoldPreset,
  ScaffoldPresetName,
} from "./presets.js";
import type { SiteTemplateVariables } from "./template_types.js";

const OPTION_DEPTH: Readonly<Record<ScaffoldPresetName, number>> = {
  empty: 0,
  "digital-garden": 2,
  blog: 2,
  docs: 2,
  portfolio: 2,
  minimal: 0,
  starter: 2,
  showcase: 3,
};

function optionContext(
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): ScaffoldOptionContext {
  return {
    variables,
    languages: preset.languages,
    depth: OPTION_DEPTH[preset.name],
  };
}

function renderOptionValue(
  value: ScaffoldOptionValue,
  context: ScaffoldOptionContext,
): string {
  return typeof value === "function" ? value(context) : value;
}

/**
 * Resolve a plugin's options literal for the preset's depth, or `null` when
 * the plugin takes no options at that depth (and should be called bare).
 */
export function renderOptions(
  options: ScaffoldOptions | undefined,
  context: ScaffoldOptionContext,
): string | null {
  if (options === undefined) return null;
  if (typeof options === "string") return options;
  if (typeof options === "function") return options(context);
  const fields = Object.entries(options)
    .filter(([, field]) => field.depth <= context.depth)
    .map(
      ([key, field]) => `${key}: ${renderOptionValue(field.value, context)}`,
    );
  return fields.length === 0 ? null : `{ ${fields.join(", ")} }`;
}

export function pluginExpression(
  plugin: ScaffoldPreset["plugins"][number],
  preset: ScaffoldPreset,
  variables: SiteTemplateVariables,
): string {
  const options = renderOptions(
    plugin.options,
    optionContext(preset, variables),
  );
  return options === null
    ? `${plugin.factory}()`
    : `${plugin.factory}(${options})`;
}

/**
 * The options object literal used for a plugin at this preset's depth, or
 * `null` when it takes no options at that depth.
 */
export function readmePluginOptions(
  variables: SiteTemplateVariables,
  preset: ScaffoldPreset,
  plugin: ScaffoldPreset["plugins"][number],
): string | null {
  return renderOptions(plugin.options, optionContext(preset, variables));
}
