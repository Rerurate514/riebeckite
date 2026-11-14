import {
  type CliCommandDefinition,
  CliUsageError,
  cliArgument,
  cliBoolean,
  cliExample,
  cliVariadicArgument,
  defineCliCommand,
} from "@riebeckite/core";
import {
  formatPathHelp,
  formatRootHelp,
  generateCompletion,
} from "@riebeckite/core/cli";
import { registryFor } from "./builtin_commands_shared.js";

export function helpCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "help",
    summary: "Show help for a command.",
    arguments: [
      cliVariadicArgument("command", {
        description: "Command path.",
      }),
    ],
    async handler(context, input) {
      const path = (input.arguments.command as readonly string[]).join(" ");
      if (path === "") {
        context.output.writeLine(
          formatRootHelp(context.registry, helpOptions()),
        );
        return;
      }
      try {
        context.output.writeLine(
          formatPathHelp(context.registry, path, helpOptions()),
        );
      } catch (error) {
        if (!(error instanceof CliUsageError)) throw error;
        const registry = await registryFor(context);
        context.output.writeLine(formatPathHelp(registry, path, helpOptions()));
      }
    },
  });
}

export function completionCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "completion",
    summary: "Generate shell completion.",
    arguments: [
      cliArgument("shell", {
        description: "Shell to generate completion for.",
        required: true,
        values: ["bash", "zsh", "powershell"],
      }),
    ],
    options: [
      cliBoolean("project", {
        description: "Include commands registered by project plugins.",
      }),
    ],
    examples: [
      cliExample("riebeckite completion bash"),
      cliExample("riebeckite completion powershell --project"),
    ],
    async handler(context, input) {
      const registry =
        input.options.project === true
          ? await registryFor(context)
          : context.registry;
      context.output.writeLine(
        generateCompletion(
          registry,
          input.arguments.shell as "bash" | "zsh" | "powershell",
        ),
      );
    },
  });
}

export function groupCommand(
  id: string,
  summary: string,
): CliCommandDefinition {
  return defineCliCommand({
    id,
    summary,
    handler(context) {
      context.output.writeLine(
        formatPathHelp(context.registry, id, helpOptions()),
      );
    },
  });
}

export function helpOptions() {
  const columns = process.stdout.columns;
  return {
    width: typeof columns === "number" && columns > 0 ? columns : 80,
  };
}
