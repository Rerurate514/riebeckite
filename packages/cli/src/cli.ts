import {
  isScaffoldPresetName,
  SCAFFOLD_PRESET_NAMES,
  type ScaffoldPresetName,
  scaffoldPresets,
} from "@riebeckite/honox";
import { resolveRiebeckiteProject } from "./application_root.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { runDev } from "./commands/dev.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { type InspectTarget, runInspect } from "./commands/inspect.js";
import { runProfile } from "./commands/profile.js";
import { renderCliError } from "./error_renderer.js";

export async function main(arguments_: readonly string[]): Promise<void> {
  try {
    const command = parseCommand(arguments_);

    if (command.name === "init") {
      if (command.listPresets) {
        printPresets();
        return;
      }
      await runInit({
        directory: command.directory,
        force: command.force,
        preset: command.preset,
      });
      return;
    }

    const project = await resolveRiebeckiteProject(process.cwd());

    if (command.name === "dev") {
      await runDev(project);
      return;
    }
    if (command.name === "build") {
      await runBuild(project, { full: command.full });
      return;
    }
    if (command.name === "doctor") {
      if (!(await runDoctorCommand(project))) process.exitCode = 1;
      return;
    }
    if (command.name === "profile") {
      await runProfile(project, { full: command.full });
      return;
    }
    if (command.name === "inspect") {
      await runInspect(project, {
        target: command.target,
        list: command.list,
      });
      return;
    }

    await runCheck(project);
    console.log("Riebeckite configuration is valid.");
  } catch (error) {
    console.error(renderCliError(error));
    process.exitCode = 1;
  }
}

type Command =
  | { name: "dev" }
  | { name: "build"; full: boolean }
  | { name: "check" }
  | { name: "doctor" }
  | {
      name: "init";
      directory: string;
      force: boolean;
      preset: ScaffoldPresetName;
      listPresets: boolean;
    }
  | { name: "profile"; full: boolean }
  | { name: "inspect"; target?: InspectTarget; list: boolean };

function parseCommand(arguments_: readonly string[]): Command {
  const [name, ...options] = arguments_;
  if (name === "dev" && options.length === 0) return { name };
  if (name === "check" && options.length === 0) return { name };
  if (name === "init") return parseInitCommand(options);
  if (
    name === "build" &&
    (options.length === 0 || (options.length === 1 && options[0] === "--full"))
  ) {
    return { name, full: options[0] === "--full" };
  }
  if (name === "inspect") return parseInspectCommand(options);
  if (name === "doctor" && options.length === 0) return { name };
  if (
    name === "profile" &&
    (options.length === 0 || (options.length === 1 && options[0] === "--full"))
  ) {
    return { name, full: options[0] === "--full" };
  }

  throw new CliUsageError(
    "Usage: riebeckite <init [directory] [--preset <name>] [--force] [--list-presets] | dev | build [--full] | check | doctor | profile [--full] | inspect [config | plugins | content [--list] | graph | build]>",
  );
}

function parseInitCommand(options: readonly string[]): Command {
  let directory: string | undefined;
  let force = false;
  let listPresets = false;
  let preset: ScaffoldPresetName | undefined;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--force") {
      force = true;
      continue;
    }
    if (option === "--list-presets") {
      listPresets = true;
      continue;
    }
    if (option === "--preset") {
      const value = options[index + 1];
      if (value === undefined || !isScaffoldPresetName(value)) {
        throw new CliUsageError(
          `Unknown preset: ${value ?? "(missing)"}. ` +
            `Available presets: ${SCAFFOLD_PRESET_NAMES.join(", ")}.`,
        );
      }
      preset = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-")) {
      throw new CliUsageError(`Unknown init option: ${option}`);
    }
    if (directory !== undefined) {
      throw new CliUsageError(
        "Usage: riebeckite init [directory] [--preset <name>] [--force]",
      );
    }
    directory = option;
  }

  return {
    name: "init",
    directory: directory ?? ".",
    force,
    preset: preset ?? "starter",
    listPresets,
  };
}

function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const name of SCAFFOLD_PRESET_NAMES) {
    console.log(`  ${name}: ${scaffoldPresets[name].description}`);
  }
}

function parseInspectCommand(options: readonly string[]): Command {
  if (options.length === 0) return { name: "inspect", list: false };
  if (options.length === 1 && isInspectTarget(options[0])) {
    return { name: "inspect", target: options[0], list: false };
  }
  if (
    options.length === 2 &&
    options[0] === "content" &&
    options[1] === "--list"
  ) {
    return { name: "inspect", target: "content", list: true };
  }

  const target = options[0] ?? "";
  if (target && !isInspectTarget(target)) {
    throw new CliUsageError(
      `Unknown inspect target: ${target}\n\nAvailable:\n  config\n  plugins\n  content\n  graph\n  build`,
    );
  }
  throw new CliUsageError(
    "Usage: riebeckite inspect [config | plugins | content [--list] | graph | build]",
  );
}

function isInspectTarget(value: string | undefined): value is InspectTarget {
  return (
    value === "config" ||
    value === "plugins" ||
    value === "content" ||
    value === "graph" ||
    value === "build"
  );
}

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}
