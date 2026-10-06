import { scaffoldDeploymentFromFlags } from "./scaffold/deployment.js";
import type { ScaffoldDeployment } from "./scaffold/options.js";
import {
  isScaffoldPresetName,
  SCAFFOLD_PRESET_NAMES,
  SCAFFOLD_PRESETS,
  type ScaffoldPresetName,
} from "./scaffold/presets.js";
import {
  parseScaffoldUtilities,
  SCAFFOLD_DEFAULT_UTILITIES,
  type ScaffoldUtilityName,
} from "./scaffold/utilities.js";

export type CreateRiebeckiteOptions = {
  readonly directory: string;
  readonly force: boolean;
  readonly preset: ScaffoldPresetName;
  readonly utilities: readonly ScaffoldUtilityName[];
  readonly listPresets: boolean;
  readonly deployment: ScaffoldDeployment;
};

export function parseArguments(
  arguments_: readonly string[],
): CreateRiebeckiteOptions {
  let directory: string | undefined;
  let force = false;
  let preset: ScaffoldPresetName | undefined;
  let utilities: readonly ScaffoldUtilityName[] | undefined;
  let listPresets = false;
  let githubActions = false;
  let contentRepository: string | undefined;
  let siteRepository: string | undefined;

  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--force") {
      force = true;
      continue;
    }
    if (argument === "--list-presets") {
      listPresets = true;
      continue;
    }
    if (argument === "--github-actions") {
      githubActions = true;
      continue;
    }
    if (
      argument === "--content-repository" ||
      argument === "--site-repository"
    ) {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(`${argument} requires an owner/repository value.`);
      }
      if (argument === "--content-repository") contentRepository = value;
      else siteRepository = value;
      index += 1;
      continue;
    }
    if (argument === "--preset") {
      const value = arguments_[index + 1];
      if (value === undefined || !isScaffoldPresetName(value)) {
        throw new Error(
          `Unknown preset: ${value ?? "(missing)"}. ` +
            `Available presets: ${SCAFFOLD_PRESET_NAMES.join(", ")}.`,
        );
      }
      preset = value;
      index += 1;
      continue;
    }
    if (argument === "--utilities") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error(
          "--utilities requires a comma-separated list of utility names.",
        );
      }
      utilities = parseScaffoldUtilities(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (directory !== undefined) {
      throw new Error(
        "Usage: create-riebeckite [directory] [--preset <name>] [--utilities <names>] [--github-actions] [--content-repository <owner/repository>] [--site-repository <owner/repository>] [--force]",
      );
    }
    directory = argument;
  }

  return {
    directory: directory ?? ".",
    force,
    preset: preset ?? "starter",
    utilities: utilities ?? SCAFFOLD_DEFAULT_UTILITIES,
    listPresets,
    deployment: scaffoldDeploymentFromFlags({
      githubActions,
      contentRepository,
      siteRepository,
    }),
  };
}

export function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const { name, description } of SCAFFOLD_PRESETS) {
    console.log(`  ${name}: ${description}`);
  }
}
