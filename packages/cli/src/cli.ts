import { resolveRiebeckiteApplication } from "./application_root";
import { runBuild } from "./commands/build";
import { runCheck } from "./commands/check";
import { runDev } from "./commands/dev";
import { runDoctorCommand } from "./commands/doctor";
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
  | { name: "doctor" };

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
  if (name === "doctor" && options.length === 0) return { name };

  throw new CliUsageError(
    "Usage: riebeckite <dev | build [--full] | check | doctor>",
  );
}

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}
