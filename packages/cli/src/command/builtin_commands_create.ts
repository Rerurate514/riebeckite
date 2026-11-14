import {
  type CliCommandDefinition,
  cliArgument,
  cliBoolean,
  cliExample,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import {
  PLUGIN_FEATURE_IDS,
  parsePluginFeatures,
} from "../plugin_generator/registry.js";
import { THEME_FEATURE_IDS } from "../theme_generator/registry.js";
import {
  validateCommaSeparated,
  validateKebabName,
} from "./builtin_commands_shared.js";

export const themeFeatureOption = cliString("features", {
  description: "Comma-separated Theme feature names.",
  valueName: "names",
  validate: validateCommaSeparated(THEME_FEATURE_IDS, "theme feature"),
});

export const pluginFeatureOption = cliString("features", {
  description: "Comma-separated Plugin feature names.",
  valueName: "names",
  validate: validateCommaSeparated(PLUGIN_FEATURE_IDS, "plugin feature"),
});

export const pluginNameArgument = cliArgument("name", {
  description: "Plugin name.",
  validate: validateKebabName("Plugin name"),
});

export const pluginDirectoryOption = cliString("directory", {
  description: "Target directory.",
  valueName: "path",
});

export function createCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "create",
    summary: "Create a site, Plugin, Theme, PageType, or Component.",
    examples: [
      cliExample("riebeckite create plugin my-plugin --features transform"),
    ],
    async handler() {
      const { runInteractiveCreate } = await import("../commands/create.js");
      await runInteractiveCreate();
    },
  });
}

export function createSiteCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "create site",
    summary: "Scaffold a new site with create-riebeckite.",
    raw: true,
    examples: [cliExample("riebeckite create site my-site --preset minimal")],
    async handler(_context, input) {
      const { runCreateSite } = await import("../commands/create.js");
      await runCreateSite(input.rawArguments);
    },
  });
}

export function createPluginCommand(): CliCommandDefinition {
  const template = cliString("template", {
    description: "Comma-separated Plugin feature names.",
    valueName: "names",
    validate: validateCommaSeparated(PLUGIN_FEATURE_IDS, "plugin feature"),
  });
  return defineCliCommand({
    id: "create plugin",
    summary: "Create a local Plugin.",
    arguments: [pluginNameArgument],
    options: [
      template,
      pluginFeatureOption,
      pluginDirectoryOption,
      {
        ...cliBoolean("tests", {
          description: "Generate tests.",
          negatable: true,
        }),
        default: true,
      },
      {
        ...cliBoolean("docs", {
          description: "Generate README documentation.",
          negatable: true,
        }),
        default: true,
      },
      cliBoolean("register", {
        description: "Register the Plugin in riebeckite.config.ts.",
      }),
    ],
    validate(input) {
      if (
        input.options.template !== undefined &&
        input.options.features !== undefined
      )
        return "Use either --template or --features, not both.";
      if (input.arguments.name === undefined) {
        return input.rawArguments.length === 0
          ? undefined
          : "create plugin requires a plugin name outside an interactive terminal.";
      }
      return input.options.template === undefined &&
        input.options.features === undefined
        ? "create plugin requires --template or --features outside an interactive terminal."
        : undefined;
    },
    async handler(_context, input) {
      if (input.arguments.name === undefined) {
        const { runInteractiveCreatePlugin } = await import(
          "../commands/create_plugin.js"
        );
        await runInteractiveCreatePlugin();
        return;
      }
      const { runCreatePlugin } = await import("../commands/create_plugin.js");
      const name = input.arguments.name;
      const featureValue =
        (input.options.template as string | undefined) ??
        (input.options.features as string | undefined);
      await runCreatePlugin({
        name,
        directory:
          (input.options.directory as string | undefined) ??
          `extensions/${name}`,
        features: parsePluginFeatures(featureValue ?? ""),
        tests: input.options.tests as boolean,
        documentation: input.options.docs as boolean,
        register: input.options.register as boolean,
      });
    },
  });
}
