import {
  type CliCommandDefinition,
  cliArgument,
  cliBoolean,
  cliEnum,
  cliNumber,
  defineCliCommand,
} from "@riebeckite/core";
import { groupCommand } from "./builtin_commands_help.js";
import { validateKebabName } from "./builtin_commands_shared.js";

export function themeGroupCommand(): CliCommandDefinition {
  return groupCommand("theme", "Preview a local Theme.");
}

export function themePreviewCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "theme preview",
    summary: "Preview a local Theme in isolation.",
    arguments: [
      cliArgument("name", {
        description: "Theme name.",
        required: true,
        validate: validateKebabName("Theme name"),
      }),
    ],
    options: [
      cliNumber("port", {
        description: "Preview server port.",
        integer: true,
        min: 1,
        max: 65_535,
      }),
      {
        ...cliBoolean("open", {
          description: "Open the preview in a browser.",
          negatable: true,
        }),
        default: true,
      },
    ],
    async handler(_context, input) {
      const { runThemePreview } = await import("../commands/theme_preview.js");
      await runThemePreview({
        name: input.arguments.name,
        port: input.options.port as number | undefined,
        open: input.options.open as boolean,
      });
    },
  });
}

export function pluginGroupCommand(): CliCommandDefinition {
  return groupCommand("plugin", "Develop and verify local Plugins.");
}

export function pluginDevCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "plugin dev",
    summary: "Run a local Plugin in isolation.",
    arguments: [
      cliArgument("path", {
        description: "Path to the Plugin package.",
        required: true,
      }),
    ],
    options: [
      cliNumber("port", {
        description: "Development server port.",
        integer: true,
        min: 1,
        max: 65_535,
      }),
      {
        ...cliBoolean("open", {
          description: "Open the development server in a browser.",
          negatable: true,
        }),
        default: true,
      },
    ],
    async handler(_context, input) {
      const { runPluginDev } = await import("../commands/plugin_dev.js");
      await runPluginDev({
        pluginPath: input.arguments.path,
        port: input.options.port as number | undefined,
        open: input.options.open as boolean,
      });
    },
  });
}

export function pluginVerifyCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "plugin verify",
    summary: "Verify a Plugin package contract.",
    arguments: [
      cliArgument("path", {
        description: "Path to the Plugin package.",
        required: true,
      }),
    ],
    options: [
      cliEnum("level", ["basic", "integration", "full"], {
        description: "Verification level.",
        default: "basic",
      }),
      cliBoolean("json", { description: "Print the report as JSON." }),
    ],
    async handler(_context, input) {
      const { runPluginVerify } = await import("../commands/plugin_verify.js");
      return runPluginVerify({
        pluginPath: input.arguments.path,
        level: input.options.level as "basic" | "integration" | "full",
        json: input.options.json as boolean,
      });
    },
  });
}
