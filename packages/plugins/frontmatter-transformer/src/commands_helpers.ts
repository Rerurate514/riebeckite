import {
  type CliCommandContext,
  type CliCommandInput,
  cliArgument,
  cliBoolean,
  cliNumber,
  cliString,
} from "@riebeckite/core";
import { FileSystemContentMigration } from "@riebeckite/node";
import { frontmatterPresetRegistry } from "./presets.js";

export const JSON_OPTION = cliBoolean("json", {
  description: "Write machine-readable JSON to stdout.",
});

export const APPLY_OPTION = cliBoolean("apply", {
  description: "Write the changes instead of printing a dry run.",
});

export const PRESET_OPTION = cliString("preset", {
  description: "Frontmatter preset to run.",
  valueName: "name",
  repeatable: true,
});

export const PLAN_OPTION = cliString("plan", {
  description: "Use a previously saved migration plan.",
  valueName: "path",
});

export const OUT_OPTION = cliString("out", {
  description: "Write the plan to a file.",
  valueName: "path",
});

export const LIMIT_OPTION = cliNumber("limit", {
  description: "Maximum number of history runs.",
  integer: true,
  min: 0,
});

export const TARGET_ARGUMENT = cliArgument("target", {
  description: "Plan ID or migration ID to roll back.",
  required: true,
});

export async function createMigration(
  project: Awaited<ReturnType<CliCommandContext["loadProject"]>>,
  presetIds?: readonly string[],
) {
  return new FileSystemContentMigration({
    contentDirectory: project.contentRoot,
    registry: frontmatterPresetRegistry(presetIds),
    config: project.config,
    plugins: project.config?.plugins,
    buildTime: new Date(),
  });
}

export function readPresetsInput(input: CliCommandInput): readonly string[] {
  const value = input.options.preset;
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];
}
