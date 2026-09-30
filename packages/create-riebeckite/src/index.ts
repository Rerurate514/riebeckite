import path from "node:path";
import {
  formatScaffoldNextSteps,
  isScaffoldPresetName,
  SCAFFOLD_PRESET_NAMES,
  type ScaffoldPresetName,
  ScaffoldSiteError,
  scaffoldPresets,
  scaffoldRiebeckiteSite,
} from "@riebeckite/honox";

export type CreateRiebeckiteOptions = {
  readonly directory: string;
  readonly force: boolean;
  readonly preset: ScaffoldPresetName;
  readonly listPresets: boolean;
  readonly githubActions: boolean;
  readonly contentRepository?: string;
  readonly siteRepository?: string;
};

export async function runCreateRiebeckite(
  arguments_: readonly string[],
): Promise<void> {
  let options: CreateRiebeckiteOptions;
  try {
    options = parseArguments(arguments_);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
    return;
  }

  if (options.listPresets) {
    printPresets();
    return;
  }

  const targetDirectory = path.resolve(process.cwd(), options.directory);
  try {
    const result = await scaffoldRiebeckiteSite({
      targetDirectory,
      overwrite: options.force,
      preset: options.preset,
      githubActions: options.githubActions,
      contentRepository: options.contentRepository,
      siteRepository: options.siteRepository,
    });
    const relative =
      path.relative(process.cwd(), result.targetDirectory) || ".";
    console.log(`Created a ${options.preset} Riebeckite site in ${relative}`);
    console.log("");
    console.log(formatScaffoldNextSteps(relative));
    if (options.contentRepository !== undefined) {
      console.log("");
      console.log(
        "Copy github/notify-site.yml to the content repository as .github/workflows/notify-site.yml.",
      );
    }
  } catch (error) {
    if (error instanceof ScaffoldSiteError) {
      console.error(error.message);
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}

function parseArguments(
  arguments_: readonly string[],
): CreateRiebeckiteOptions {
  let directory: string | undefined;
  let force = false;
  let preset: ScaffoldPresetName | undefined;
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
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (directory !== undefined) {
      throw new Error(
        "Usage: create-riebeckite [directory] [--preset <name>] [--github-actions] [--content-repository <owner/repository>] [--site-repository <owner/repository>] [--force]",
      );
    }
    directory = argument;
  }

  return {
    directory: directory ?? ".",
    force,
    preset: preset ?? "starter",
    listPresets,
    githubActions,
    contentRepository,
    siteRepository,
  };
}

function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const name of SCAFFOLD_PRESET_NAMES) {
    console.log(`  ${name}: ${scaffoldPresets[name].description}`);
  }
}
