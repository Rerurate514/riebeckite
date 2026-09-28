import { resolveRiebeckiteApplication } from "./application_root";
import { runBuild } from "./commands/build";
import { runCheck } from "./commands/check";
import { runDev } from "./commands/dev";
import { runDoctorCommand } from "./commands/doctor";
import { runInspect, type InspectTarget } from "./commands/inspect";
import { runProfile } from "./commands/profile";
import { renderCliError } from "./error_renderer";

export async function main(arguments_: readonly string[]): Promise<void> {
  try {
    const command = parseCommand(arguments_);
    const application = await resolveRiebeckiteApplication(process.cwd());

    if (command.name === "dev") {
      await runDev(application);
      return;
    }
    if (command.name === "build") {
      await runBuild(application, { full: command.full });
      return;
    }
    if (command.name === "doctor") {
      if (!(await runDoctorCommand(application))) process.exitCode = 1;
      return;
    }
    if (command.name === "profile") {
      await runProfile(application, { full: command.full });
      return;
    }
    if (command.name === "inspect") {
      await runInspect(application, {
        target: command.target,
        list: command.list,
      });
      return;
    }

    await runCheck(application);
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
  | { name: "profile"; full: boolean }
  | { name: "inspect"; target?: InspectTarget; list: boolean };

function parseCommand(arguments_: readonly string[]): Command {
  const [name, ...options] = arguments_;
  if (name === "dev" && options.length === 0) return { name };
  if (name === "check" && options.length === 0) return { name };
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
    "Usage: riebeckite <dev | build [--full] | check | doctor | profile [--full] | inspect [config | plugins | content [--list] | graph | build]>",
  );
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
