import {
  type CliCommandDefinition,
  cliBoolean,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import { project } from "./builtin_commands_shared.js";

export function inspectCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "inspect",
    summary: "Inspect the resolved project.",
    description:
      "Inspect configuration, plugins, content, the content graph, build output, assets, provenance, or managed APIs. Use an inspect subcommand to narrow the report.",
    requiresProject: true,
    async handler(context) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        list: false,
        json: false,
      });
    },
  });
}

export function inspectTargetCommand(
  target: "config" | "plugins" | "graph" | "build",
): CliCommandDefinition {
  return defineCliCommand({
    id: `inspect ${target}`,
    summary: `Inspect ${target}.`,
    requiresProject: true,
    async handler(context) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        target,
        list: false,
        json: false,
      });
    },
  });
}

export function inspectConfigCommand(): CliCommandDefinition {
  return inspectTargetCommand("config");
}

export function inspectPluginsCommand(): CliCommandDefinition {
  return inspectTargetCommand("plugins");
}

export function inspectGraphCommand(): CliCommandDefinition {
  return inspectTargetCommand("graph");
}

export function inspectBuildCommand(): CliCommandDefinition {
  return inspectTargetCommand("build");
}

export function inspectContentCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "inspect content",
    summary: "Inspect content entries.",
    requiresProject: true,
    options: [
      cliBoolean("list", { description: "List all content entries." }),
      cliString("path", {
        description: "Select one path or permalink.",
        valueName: "path",
      }),
    ],
    async handler(context, input) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        target: "content",
        list: input.options.list as boolean,
        path: input.options.path as string | undefined,
        json: false,
      });
    },
  });
}

export function inspectAssetsCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "inspect assets",
    summary: "Inspect content assets and duplicates.",
    requiresProject: true,
    supportsJson: true,
    options: [
      cliBoolean("list", { description: "List every asset." }),
      cliBoolean("json", { description: "Print the report as JSON." }),
    ],
    async handler(context, input) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        target: "assets",
        list: input.options.list as boolean,
        json: input.options.json as boolean,
      });
    },
  });
}

export function inspectProvenanceCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "inspect provenance",
    summary: "Inspect recorded provenance.",
    requiresProject: true,
    supportsJson: true,
    options: [
      cliBoolean("json", { description: "Print the report as JSON." }),
      cliString("source", {
        description: "Filter by source file.",
        valueName: "source",
      }),
      cliString("output", {
        description: "Filter by output file.",
        valueName: "output",
      }),
      cliString("compare", {
        description: "Compare against a recorded revision.",
        valueName: "revision",
      }),
    ],
    async handler(context, input) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        target: "provenance",
        list: false,
        json: input.options.json as boolean,
        source: input.options.source as string | undefined,
        output: input.options.output as string | undefined,
        compare: input.options.compare as string | undefined,
      });
    },
  });
}

export function inspectApiCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "inspect api",
    summary: "Inspect managed API lifecycle metadata.",
    requiresProject: true,
    supportsJson: true,
    options: [
      cliBoolean("deprecated", {
        description: "List deprecated APIs only.",
      }),
      cliBoolean("json", { description: "Print the report as JSON." }),
    ],
    async handler(context, input) {
      const { runInspect } = await import("../commands/inspect.js");
      await runInspect(await project(context), {
        target: "api",
        list: false,
        json: input.options.json as boolean,
        deprecatedOnly: input.options.deprecated as boolean,
      });
    },
  });
}
