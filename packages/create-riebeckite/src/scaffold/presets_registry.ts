import type { ScaffoldPresetName } from "./presets_languages.js";
import { SCAFFOLD_PRESET_NAMES } from "./presets_languages.js";
import {
  blog,
  digitalGarden,
  documentation,
  empty,
  minimal,
  portfolio,
  showcase,
  starter,
} from "./presets_list.js";
import type { ScaffoldPreset } from "./presets_types.js";

export const scaffoldPresets: Readonly<
  Record<ScaffoldPresetName, ScaffoldPreset>
> = {
  starter,
  "digital-garden": digitalGarden,
  blog,
  docs: documentation,
  portfolio,
  minimal,
  showcase,
  empty,
} as const;

export const SCAFFOLD_DEFAULT_PRESET: ScaffoldPresetName = "starter";

export type ScaffoldPresetSummary = {
  readonly name: ScaffoldPresetName;
  readonly description: string;
};

export const SCAFFOLD_PRESETS: readonly ScaffoldPresetSummary[] =
  SCAFFOLD_PRESET_NAMES.map((name) => ({
    name,
    description: scaffoldPresets[name].description,
  }));

export function resolveScaffoldPreset(
  value: ScaffoldPresetName | undefined,
): ScaffoldPreset {
  if (value === undefined) {
    const preset = scaffoldPresets[SCAFFOLD_DEFAULT_PRESET];
    validateScaffoldPreset(preset);
    return preset;
  }
  const preset = scaffoldPresets[value];
  if (!preset) {
    throw new Error(
      `Unknown scaffold preset: ${value}. ` +
        `Available presets: ${SCAFFOLD_PRESET_NAMES.join(", ")}.`,
    );
  }
  validateScaffoldPreset(preset);
  return preset;
}

export function validateScaffoldPreset(preset: ScaffoldPreset): void {
  const factories = new Map<string, string>();
  const packages = new Map<string, string>();

  for (const plugin of preset.plugins) {
    if (plugin.package.trim() === "" || plugin.factory.trim() === "") {
      throw new Error(`Invalid plugin declaration in preset "${preset.name}".`);
    }
    const factoryPackage = factories.get(plugin.factory);
    if (factoryPackage !== undefined && factoryPackage !== plugin.package) {
      throw new Error(
        `Preset "${preset.name}" imports "${plugin.factory}" from both "${factoryPackage}" and "${plugin.package}".`,
      );
    }
    const packageFactory = packages.get(plugin.package);
    if (packageFactory === plugin.factory) {
      throw new Error(
        `Preset "${preset.name}" registers "${plugin.factory}" from "${plugin.package}" more than once.`,
      );
    }
    factories.set(plugin.factory, plugin.package);
    packages.set(plugin.package, plugin.factory);
  }

  if (
    preset.theme &&
    preset.plugins.some((plugin) => plugin.factory === preset.theme?.factory)
  ) {
    throw new Error(
      `Preset "${preset.name}" reuses theme factory "${preset.theme.factory}" as a plugin import.`,
    );
  }
}
