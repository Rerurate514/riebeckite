import {
  type CliCommandDefinition,
  cliArgument,
  cliBoolean,
  cliEnum,
  cliString,
  defineCliCommand,
} from "@riebeckite/core";
import {
  parseThemeFeatures,
  parseThemeTemplate,
  THEME_TEMPLATE_IDS,
  themeTemplateRegistry,
} from "../theme_generator/registry.js";
import {
  pluginDirectoryOption,
  themeFeatureOption,
} from "./builtin_commands_create.js";
import {
  validateKebabName,
  validatePagePath,
} from "./builtin_commands_shared.js";

export function createThemeCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "create theme",
    summary: "Create a local Theme.",
    arguments: [
      cliArgument("name", {
        description: "Theme name.",
        validate: validateKebabName("Theme name"),
      }),
    ],
    options: [
      cliBoolean("list", { description: "List Theme templates and exit." }),
      cliEnum("template", THEME_TEMPLATE_IDS, {
        description: "Template to start from.",
        valueName: "name",
        default: "minimal",
      }),
      themeFeatureOption,
      pluginDirectoryOption,
      {
        ...cliBoolean("dark-mode", {
          description: "Include dark mode styles.",
          negatable: true,
        }),
        default: true,
      },
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
        description: "Register the Theme in riebeckite.config.ts.",
      }),
    ],
    validate(input) {
      if (input.options.list === true) {
        return input.rawArguments.length === 1
          ? undefined
          : "create theme --list does not accept other options.";
      }
      if (input.arguments.name !== undefined) return undefined;
      return input.rawArguments.length === 0
        ? undefined
        : "create theme requires a theme name outside an interactive terminal.";
    },
    async handler(context, input) {
      if (input.options.list === true) {
        for (const template of Object.values(themeTemplateRegistry)) {
          context.output.writeLine(`${template.id}: ${template.description}`);
        }
        return;
      }
      if (input.arguments.name === undefined) {
        const { runInteractiveCreateTheme } = await import(
          "../commands/create_theme.js"
        );
        await runInteractiveCreateTheme();
        return;
      }
      const { runCreateTheme } = await import("../commands/create_theme.js");
      const name = input.arguments.name;
      await runCreateTheme({
        name,
        directory:
          (input.options.directory as string | undefined) ?? `themes/${name}`,
        template: parseThemeTemplate(input.options.template as string),
        features: parseThemeFeatures(
          (input.options.features as string | undefined) ?? "",
        ),
        darkMode: input.options.darkMode as boolean,
        tests: input.options.tests as boolean,
        documentation: input.options.docs as boolean,
        register: input.options.register as boolean,
      });
    },
  });
}

export function createPageTypeCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "create page-type",
    summary: "Create a routable PageType.",
    arguments: [
      cliArgument("name", {
        description: "PageType name.",
        validate: validateKebabName("PageType name"),
      }),
    ],
    options: [
      cliString("plugin", {
        description: "Plugin that owns the PageType.",
        valueName: "name",
        validate: validateKebabName("Plugin name"),
      }),
      cliString("path", {
        description: "Route path for the PageType.",
        valueName: "path",
        validate: validatePagePath,
      }),
      cliBoolean("with-tests", { description: "Generate tests." }),
      cliBoolean("register", {
        description: "Register the PageType in the Plugin.",
      }),
    ],
    validate(input) {
      if (input.arguments.name !== undefined) return undefined;
      return input.rawArguments.length === 0
        ? undefined
        : "create page-type requires a PageType name outside an interactive terminal.";
    },
    async handler(_context, input) {
      if (input.arguments.name === undefined) {
        const { runInteractiveCreatePageType } = await import(
          "../commands/create_page_type.js"
        );
        await runInteractiveCreatePageType();
        return;
      }
      const { runCreatePageType } = await import(
        "../commands/create_page_type.js"
      );
      const name = input.arguments.name;
      await runCreatePageType({
        name,
        plugin: input.options.plugin as string | undefined,
        path: (input.options.path as string | undefined) ?? `/${name}/`,
        tests: input.options.withTests as boolean,
        register: input.options.register as boolean,
      });
    },
  });
}

export function createComponentCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "create component",
    summary: "Create a Site, Plugin, or Theme Component.",
    arguments: [
      cliArgument("name", {
        description: "Component name.",
        validate: validateKebabName("Component name"),
      }),
    ],
    options: [
      cliEnum("target", ["site", "plugin", "theme"], {
        description: "Component owner.",
        default: "site",
      }),
      cliString("plugin", {
        description: "Plugin that owns the Component.",
        valueName: "name",
        validate: validateKebabName("Plugin name"),
      }),
      cliString("theme", {
        description: "Theme that owns the Component.",
        valueName: "name",
        validate: validateKebabName("Theme name"),
      }),
      cliBoolean("with-tests", { description: "Generate tests." }),
      cliBoolean("with-styles", { description: "Generate a stylesheet." }),
    ],
    validate(input) {
      if (
        input.options.target === "plugin" &&
        input.options.plugin === undefined
      )
        return "--plugin is required when --target plugin is used.";
      if (input.options.theme !== undefined && input.options.target !== "theme")
        return "--theme can only be used when --target theme is used.";
      if (input.arguments.name !== undefined) return undefined;
      return input.rawArguments.length === 0
        ? undefined
        : "create component requires a component name outside an interactive terminal.";
    },
    async handler(_context, input) {
      if (input.arguments.name === undefined) {
        const { runInteractiveCreateComponent } = await import(
          "../commands/create_component.js"
        );
        await runInteractiveCreateComponent();
        return;
      }
      const { runCreateComponent } = await import(
        "../commands/create_component.js"
      );
      await runCreateComponent({
        name: input.arguments.name,
        target: input.options.target as "site" | "plugin" | "theme",
        plugin: input.options.plugin as string | undefined,
        theme: input.options.theme as string | undefined,
        tests: input.options.withTests as boolean,
        styles: input.options.withStyles as boolean,
      });
    },
  });
}
