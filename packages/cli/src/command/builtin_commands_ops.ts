import { AI_CLIENTS, type AiClient } from "@riebeckite/ai";
import {
  type CliCommandDefinition,
  cliBoolean,
  cliEnum,
  cliExample,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import { groupCommand } from "./builtin_commands_help.js";
import { project } from "./builtin_commands_shared.js";

function isAiClient(value: string): value is AiClient {
  return AI_CLIENTS.some((client) => client === value);
}

export function devCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "dev",
    summary: "Start the development server.",
    requiresProject: true,
    examples: [cliExample("riebeckite dev")],
    async handler(context, _input) {
      const { runDev } = await import("../commands/dev.js");
      await runDev(await project(context), undefined, { indicator: true });
    },
  });
}

export function buildCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "build",
    summary: "Build the static site.",
    requiresProject: true,
    options: [
      cliBoolean("full", {
        description: "Run the full production build.",
      }),
    ],
    examples: [
      cliExample("riebeckite build"),
      cliExample("riebeckite build --full"),
    ],
    async handler(context, input) {
      const { runBuild } = await import("../commands/build.js");
      await runBuild(await project(context), { full: input.options.full });
    },
  });
}

export function cleanCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "clean",
    summary: "Remove Riebeckite state and build output.",
    requiresProject: true,
    options: [
      cliBoolean("output", {
        description: "Remove only the build output.",
      }),
      cliBoolean("all", {
        description: "Remove state and build output.",
      }),
    ],
    validate(input) {
      return input.options.output === true && input.options.all === true
        ? "Use either --output or --all, not both."
        : undefined;
    },
    examples: [cliExample("riebeckite clean --output")],
    async handler(context, input) {
      const { runClean } = await import("../commands/clean.js");
      const scope = input.options.all
        ? "all"
        : input.options.output
          ? "output"
          : "state";
      await runClean(await project(context), { scope });
    },
  });
}

export function checkCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "check",
    summary: "Typecheck and validate the project.",
    requiresProject: true,
    async handler(context) {
      const { runCheck } = await import("../commands/check.js");
      return runCheck(await project(context));
    },
  });
}

export function doctorCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "doctor",
    summary: "Inspect project diagnostics.",
    description:
      "Collect configuration, content, and plugin diagnostics without changing project files unless --fix is used.",
    requiresProject: true,
    supportsJson: true,
    options: [
      cliBoolean("explain", {
        description: "Explain each diagnostic.",
        short: "e",
      }),
      cliBoolean("json", {
        description: "Print the diagnostic report as JSON.",
        short: "j",
      }),
      cliBoolean("fix", { description: "Apply safe automatic fixes." }),
      cliBoolean("dry-run", {
        description: "Show fixes without writing files.",
      }),
      cliEnum("fail-on", ["error", "warning", "info"], {
        description: "Exit non-zero when this severity is found.",
        valueName: "severity",
      }),
      cliString("code", {
        description: "Only include this diagnostic code.",
        valueName: "code",
        repeatable: true,
      }),
    ],
    validate(input) {
      if (input.options.dryRun === true && input.options.fix !== true)
        return "--dry-run requires --fix.";
      if (input.options.json === true && input.options.explain === true)
        return "--json cannot be combined with --explain.";
      if (input.options.json === true && input.options.fix === true)
        return "--json cannot be combined with --fix.";
      return undefined;
    },
    examples: [
      cliExample("riebeckite doctor --json"),
      cliExample("riebeckite doctor --fix --dry-run"),
    ],
    async handler(context, input) {
      const { runDoctorCommand } = await import("../commands/doctor.js");
      return runDoctorCommand(await project(context), {
        json: input.options.json,
        explain: input.options.explain,
        fix: input.options.fix,
        dryRun: input.options.dryRun,
        failOn: input.options.failOn,
        codes: (input.options.code as readonly string[] | undefined) ?? [],
      });
    },
  });
}

export function profileCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "profile",
    summary: "Profile content and build performance.",
    requiresProject: true,
    options: [cliBoolean("full", { description: "Run the full profiler." })],
    async handler(context, input) {
      const { runProfile } = await import("../commands/profile.js");
      await runProfile(await project(context), { full: input.options.full });
    },
  });
}

export function upgradeCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "upgrade",
    summary: "Check the installed Riebeckite version against a target.",
    requiresProject: true,
    options: [
      cliBoolean("check", {
        description: "Check for an available upgrade.",
      }),
      cliString("to", {
        description: "Target version or latest.",
        valueName: "version",
        required: true,
      }),
      cliBoolean("json", { description: "Print the result as JSON." }),
    ],
    handler: async (context, input) => {
      const { runUpgradeCheck } = await import("../commands/upgrade.js");
      return runUpgradeCheck(await project(context), {
        to: input.options.to,
        json: input.options.json,
      });
    },
  });
}

export function skillsSyncCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "skills sync",
    summary: "Add and update generated Riebeckite Skills.",
    requiresProject: true,
    async handler(context) {
      const { createSetupPrompts } = await import("../prompts.js");
      const { syncSkills } = await import("../commands/skills.js");
      const prompts = createSetupPrompts();
      const mode = await prompts.select(
        "How should Skills be added or updated?",
        [
          {
            value: "review" as const,
            label: "Review each Skill before applying",
          },
          { value: "reset" as const, label: "Apply all Skill updates" },
          { value: "skip" as const, label: "Do not change Skills" },
        ],
      );
      if (mode !== "skip") {
        const resolved = await project(context);
        await syncSkills(resolved.projectRoot, prompts.confirm, mode, {
          contentDirectory: resolved.config.content.directory,
          title: resolved.config.site.title,
          locale: resolved.config.site.locale,
        });
      }
    },
  });
}

export function skillsGroupCommand(): CliCommandDefinition {
  return groupCommand("skills", "Manage generated Riebeckite Skills.");
}

export function aiGroupCommand(): CliCommandDefinition {
  return groupCommand(
    "ai",
    "Connect AI tools to local Riebeckite development.",
  );
}

export function aiSetupCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "ai setup",
    summary: "Add Riebeckite AI guidance, Skills, and MCP configuration.",
    requiresProject: true,
    options: [
      cliString("client", {
        description:
          "Write project-local MCP configuration for a client. Repeat for multiple clients.",
        valueName: "client",
        repeatable: true,
        validate: (value: string) =>
          isAiClient(value)
            ? undefined
            : `Expected one of: ${AI_CLIENTS.join(", ")}.`,
      }),
    ],
    async handler(context, input) {
      const { createSetupPrompts } = await import("../prompts.js");
      const { runAiSetup } = await import("../commands/ai_setup.js");
      await runAiSetup(await project(context), createSetupPrompts().confirm, {
        clients: (input.options.client ?? []).filter(isAiClient),
      });
    },
  });
}

export function aiMcpCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "ai mcp",
    summary: "Start local development and the Riebeckite MCP server.",
    requiresProject: true,
    options: [
      cliBoolean("mutations", {
        description:
          "Generate temporary mutation tokens and allow plan review for this session.",
      }),
    ],
    async handler(context, input) {
      const { runAiMcp } = await import("../commands/ai_mcp.js");
      await runAiMcp(await project(context), {
        mutations: input.options.mutations === true,
      });
    },
  });
}
