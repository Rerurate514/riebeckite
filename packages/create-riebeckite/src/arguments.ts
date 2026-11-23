import { scaffoldDeploymentFromFlags } from "./scaffold/deployment.js";
import type {
  ScaffoldAiOptions,
  ScaffoldDeployment,
} from "./scaffold/options.js";
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
  readonly contentDirectory?: string;
  readonly customDomain?: string;
  readonly cloneContent?: boolean;
  readonly ai?: ScaffoldAiOptions;
};

export const CREATE_RIEBECKITE_USAGE =
  "Usage: create-riebeckite [directory] [--preset <name>] [--utilities <names>] [--ai <mcp,lint,rules,skills>] [--content-directory <path>] [--domain <hostname>] [--github-actions | --cloudflare-workers] [--content-repository <owner/repository>] [--site-repository <owner/repository>] [--clone-content] [--force] [-h | --help]";

export function parseArguments(
  arguments_: readonly string[],
): CreateRiebeckiteOptions {
  let directory: string | undefined;
  let force = false;
  let preset: ScaffoldPresetName | undefined;
  let utilities: readonly ScaffoldUtilityName[] | undefined;
  let listPresets = false;
  let githubActions = false;
  let cloudflareWorkers = false;
  let contentRepository: string | undefined;
  let siteRepository: string | undefined;
  let contentDirectory: string | undefined;
  let customDomain: string | undefined;
  let cloneContent = false;
  let ai: ScaffoldAiOptions | undefined;

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
    if (argument === "--cloudflare-workers") {
      cloudflareWorkers = true;
      continue;
    }
    if (argument === "--clone-content") {
      cloneContent = true;
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
    if (argument === "--content-directory") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error("--content-directory requires a relative path.");
      }
      if (value.startsWith("/") || /^[A-Za-z]:[\\/]/.test(value)) {
        throw new Error("--content-directory must be relative to the project.");
      }
      contentDirectory = value;
      index += 1;
      continue;
    }
    if (argument === "--domain") {
      const value = arguments_[index + 1];
      if (
        value === undefined ||
        !/^[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?$/.test(value) ||
        !value.includes(".")
      ) {
        throw new Error("--domain requires a hostname such as example.com.");
      }
      customDomain = value;
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
    if (argument === "--ai") {
      const value = arguments_[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new Error("--ai requires comma-separated names.");
      }
      ai = parseAiOptions(value);
      index += 1;
      continue;
    }
    if (argument.startsWith("-")) {
      throw new Error(`Unknown option: ${argument}`);
    }
    if (directory !== undefined) {
      throw new Error(CREATE_RIEBECKITE_USAGE);
    }
    directory = argument;
  }

  const deployment = scaffoldDeploymentFromFlags({
    githubActions,
    cloudflareWorkers,
    contentRepository,
    siteRepository,
  });
  if (
    cloneContent &&
    !(
      deployment.type === "github-actions" &&
      deployment.content.type === "external"
    )
  ) {
    throw new Error(
      "--clone-content requires --content-repository and --site-repository.",
    );
  }

  return {
    directory: directory ?? ".",
    force,
    preset: preset ?? "starter",
    utilities: utilities ?? SCAFFOLD_DEFAULT_UTILITIES,
    listPresets,
    ...(contentDirectory === undefined ? {} : { contentDirectory }),
    ...(customDomain === undefined ? {} : { customDomain }),
    ...(cloneContent ? { cloneContent: true } : {}),
    ...(ai === undefined ? {} : { ai }),
    deployment,
  };
}

function parseAiOptions(value: string): ScaffoldAiOptions {
  const names = value.split(",").map((name) => name.trim());
  const allowed = new Set(["mcp", "lint", "rules", "skills"]);
  if (
    names.length === 0 ||
    names.some((name) => !allowed.has(name)) ||
    new Set(names).size !== names.length
  ) {
    throw new Error("--ai accepts mcp, lint, rules, and skills.");
  }
  return {
    mcp: names.includes("mcp"),
    lint: names.includes("lint"),
    rules: names.includes("rules"),
    skills: names.includes("skills"),
  };
}

export function printUsage(): void {
  console.log(CREATE_RIEBECKITE_USAGE);
}

export function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const { name, description } of SCAFFOLD_PRESETS) {
    console.log(`  ${name}: ${description}`);
  }
}
