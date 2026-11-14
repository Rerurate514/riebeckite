import {
  type CliCommandDefinition,
  cliArgument,
  cliExample,
  defineCliCommand,
} from "@riebeckite/core";
import { project } from "./builtin_commands_shared.js";

export function contentCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "content",
    summary: "Plan or apply content mutations.",
    requiresProject: true,
    raw: true,
    examples: [cliExample("riebeckite content create notes/hello.md --apply")],
    async handler(context, input) {
      const { runContentMutation } = await import("../commands/content.js");
      return runContentMutation(await project(context), input.rawArguments);
    },
  });
}

export function bridgeApproveCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "bridge approve",
    summary: "Interactively approve a pending Bridge content mutation.",
    requiresProject: true,
    arguments: [
      cliArgument("plan", {
        description: "Bridge mutation plan ID.",
        required: true,
      }),
    ],
    async handler(context, input) {
      const { runBridgeApproval } = await import("../commands/bridge.js");
      return runBridgeApproval(await project(context), input.arguments.plan);
    },
  });
}
