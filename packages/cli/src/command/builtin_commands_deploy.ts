import {
  type CliCommandDefinition,
  cliBoolean,
  cliExample,
  defineCliCommand,
} from "@riebeckite/core";
import { groupCommand } from "./builtin_commands_help.js";
import { project } from "./builtin_commands_shared.js";

export function deployGroupCommand(): CliCommandDefinition {
  return groupCommand("deploy", "Configure deployment for the project.");
}

export function deploySetupCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "deploy setup",
    summary: "Configure a deployment provider.",
    requiresProject: true,
    async handler(context) {
      const { runDeploySetup } = await import("../commands/deploy_setup.js");
      await runDeploySetup(await project(context));
    },
  });
}

export function deployWorkflowCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "deploy workflow",
    summary: "Update the deployment workflow from project configuration.",
    requiresProject: true,
    options: [
      cliBoolean("check", {
        description: "Report whether the workflow is current.",
      }),
    ],
    examples: [cliExample("riebeckite deploy workflow")],
    async handler(context, input) {
      const { runDeployWorkflow } = await import(
        "../commands/deploy_workflow.js"
      );
      await runDeployWorkflow(await project(context), {
        check: input.options.check === true,
      });
    },
  });
}

export function deployDomainCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "deploy domain",
    summary: "Configure a custom deployment domain.",
    requiresProject: true,
    async handler(context) {
      const { runDeployDomain } = await import("../commands/deploy_domain.js");
      await runDeployDomain(await project(context));
    },
  });
}
