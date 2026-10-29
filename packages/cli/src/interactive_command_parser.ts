import type { Command } from "./cli.js";
import { CliUsageError } from "./cli_usage_error.js";
import {
  assertPagePath,
  assertPageTypeName,
} from "./commands/create_page_type.js";
import {
  assertPluginName,
  parseCreatePluginFeatures,
} from "./commands/create_plugin.js";
import { assertThemeName } from "./commands/create_theme.js";
import {
  parseThemeFeatures,
  parseThemeTemplate,
} from "./theme_generator/registry.js";
export function parseCreatePageTypeCommand(
  options: readonly string[],
): Command {
  let pageTypeName: string | undefined;
  let plugin: string | undefined;
  let pagePath: string | undefined;
  let tests = false;
  let register = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--with-tests") {
      tests = true;
      continue;
    }
    if (option === "--register") {
      register = true;
      continue;
    }
    if (option === "--plugin" || option === "--path") {
      const value = options[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError(`${option} requires a value.`);
      if (option === "--plugin") plugin = value;
      else pagePath = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown create page-type option: ${option}`);
    if (pageTypeName)
      throw new CliUsageError("create page-type accepts one PageType name.");
    pageTypeName = option;
  }
  if (!pageTypeName && options.length === 0)
    return { name: "create-page-type-interactive" };
  if (!pageTypeName)
    throw new CliUsageError(
      "create page-type requires a PageType name outside an interactive terminal.",
    );
  try {
    assertPageTypeName(pageTypeName);
    if (plugin) assertPageTypeName(plugin);
    const resolvedPath = pagePath ?? `/${pageTypeName}/`;
    assertPagePath(resolvedPath);
    return {
      name: "create-page-type",
      options: {
        name: pageTypeName,
        plugin,
        path: resolvedPath,
        tests,
        register,
      },
    };
  } catch (error) {
    throw new CliUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
export function parseCreateComponentCommand(
  options: readonly string[],
): Command {
  let componentName: string | undefined;
  let target: "site" | "plugin" | "theme" = "site";
  let plugin: string | undefined;
  let theme: string | undefined;
  let tests = false;
  let styles = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--with-tests") {
      tests = true;
      continue;
    }
    if (option === "--with-styles") {
      styles = true;
      continue;
    }
    if (
      option === "--target" ||
      option === "--plugin" ||
      option === "--theme"
    ) {
      const value = options[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError(`${option} requires a value.`);
      if (option === "--target") {
        if (value !== "site" && value !== "plugin" && value !== "theme")
          throw new CliUsageError("--target must be site, plugin, or theme.");
        target = value;
      } else if (option === "--plugin") plugin = value;
      else theme = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown create component option: ${option}`);
    if (componentName)
      throw new CliUsageError("create component accepts one component name.");
    componentName = option;
  }
  if (!componentName && options.length === 0)
    return { name: "create-component-interactive" };
  if (!componentName)
    throw new CliUsageError(
      "create component requires a component name outside an interactive terminal.",
    );
  try {
    assertPageTypeName(componentName);
    if (plugin) assertPageTypeName(plugin);
    if (theme) assertThemeName(theme);
    if (target === "plugin" && !plugin)
      throw new Error("--plugin is required when --target plugin is used.");
    if (theme && target !== "theme")
      throw new Error("--theme can only be used when --target theme is used.");
    return {
      name: "create-component",
      options: { name: componentName, target, plugin, theme, tests, styles },
    };
  } catch (error) {
    throw new CliUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
export function parseThemePreviewCommand(options: readonly string[]): Command {
  let themeName: string | undefined;
  let port: number | undefined;
  let open = true;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--no-open") {
      open = false;
      continue;
    }
    if (option === "--port") {
      const value = options[index + 1];
      const parsed = value === undefined ? Number.NaN : Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535)
        throw new CliUsageError(
          "--port requires an integer between 1 and 65535.",
        );
      port = parsed;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown theme preview option: ${option}`);
    if (themeName !== undefined)
      throw new CliUsageError("theme preview accepts one theme name.");
    themeName = option;
  }
  if (themeName === undefined)
    throw new CliUsageError("theme preview requires a local Theme name.");
  try {
    assertThemeName(themeName);
  } catch (error) {
    throw new CliUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
  return { name: "theme-preview", themeName, port, open };
}
export function parsePluginDevCommand(options: readonly string[]): Command {
  let pluginPath: string | undefined;
  let port: number | undefined;
  let open = true;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--no-open") {
      open = false;
      continue;
    }
    if (option === "--port") {
      const value = options[index + 1];
      const parsed = value === undefined ? Number.NaN : Number(value);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65_535)
        throw new CliUsageError(
          "--port requires an integer between 1 and 65535.",
        );
      port = parsed;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown plugin dev option: ${option}`);
    if (pluginPath !== undefined)
      throw new CliUsageError("plugin dev accepts one plugin path.");
    pluginPath = option;
  }
  if (pluginPath === undefined)
    throw new CliUsageError("plugin dev requires a local plugin path.");
  return { name: "plugin-dev", pluginPath, port, open };
}
export function parsePluginVerifyCommand(options: readonly string[]): Command {
  let pluginPath: string | undefined;
  let level: import("@riebeckite/test/plugin-contract").PluginContractLevel =
    "basic";
  let json = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--json") {
      json = true;
      continue;
    }
    if (option === "--level") {
      const value = options[index + 1];
      if (value !== "basic" && value !== "integration" && value !== "full") {
        throw new CliUsageError("--level must be basic, integration, or full.");
      }
      level = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown plugin verify option: ${option}`);
    if (pluginPath !== undefined)
      throw new CliUsageError("plugin verify accepts one plugin path.");
    pluginPath = option;
  }
  if (pluginPath === undefined)
    throw new CliUsageError("plugin verify requires a plugin package path.");
  return { name: "plugin-verify", pluginPath, level, json };
}
export function parseCreateThemeCommand(options: readonly string[]): Command {
  let themeName: string | undefined;
  let directory: string | undefined;
  let template = "minimal";
  let featureValue = "";
  let darkMode = true;
  let tests = true;
  let documentation = true;
  let register = false;
  let list = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--list") {
      list = true;
      continue;
    }
    if (option === "--no-dark-mode") {
      darkMode = false;
      continue;
    }
    if (option === "--no-tests") {
      tests = false;
      continue;
    }
    if (option === "--no-docs") {
      documentation = false;
      continue;
    }
    if (option === "--register") {
      register = true;
      continue;
    }
    if (
      option === "--template" ||
      option === "--features" ||
      option === "--directory"
    ) {
      const value = options[index + 1];
      if (value === undefined || value.startsWith("-"))
        throw new CliUsageError(`${option} requires a value.`);
      if (option === "--template") template = value;
      else if (option === "--features") featureValue = value;
      else directory = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown create theme option: ${option}`);
    if (themeName !== undefined)
      throw new CliUsageError("create theme accepts one theme name.");
    themeName = option;
  }
  if (list) {
    if (themeName !== undefined || options.length !== 1)
      throw new CliUsageError(
        "create theme --list does not accept other options.",
      );
    return { name: "create-theme-list" };
  }
  if (themeName === undefined && options.length === 0)
    return { name: "create-theme-interactive" };
  if (themeName === undefined)
    throw new CliUsageError(
      "create theme requires a theme name outside an interactive terminal.",
    );
  try {
    assertThemeName(themeName);
    return {
      name: "create-theme",
      themeName,
      directory: directory ?? `themes/${themeName}`,
      template: parseThemeTemplate(template),
      features: parseThemeFeatures(featureValue),
      darkMode,
      tests,
      documentation,
      register,
    };
  } catch (error) {
    throw new CliUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
export function parseCreatePluginCommand(options: readonly string[]): Command {
  let pluginName: string | undefined;
  let directory: string | undefined;
  let featureValue: string | undefined;
  let tests = true;
  let documentation = true;
  let register = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--no-tests") {
      tests = false;
      continue;
    }
    if (option === "--no-docs") {
      documentation = false;
      continue;
    }
    if (option === "--register") {
      register = true;
      continue;
    }
    if (
      option === "--template" ||
      option === "--features" ||
      option === "--directory"
    ) {
      const value = options[index + 1];
      if (value === undefined || value.startsWith("-"))
        throw new CliUsageError(`${option} requires a value.`);
      if (option === "--directory") directory = value;
      else if (featureValue !== undefined)
        throw new CliUsageError(
          "Use either --template or --features, not both.",
        );
      else featureValue = value;
      index += 1;
      continue;
    }
    if (option.startsWith("-"))
      throw new CliUsageError(`Unknown create plugin option: ${option}`);
    if (pluginName !== undefined)
      throw new CliUsageError("create plugin accepts one plugin name.");
    pluginName = option;
  }
  if (pluginName === undefined && options.length === 0)
    return { name: "create-plugin-interactive" };
  if (pluginName === undefined)
    throw new CliUsageError(
      "create plugin requires a plugin name outside an interactive terminal.",
    );
  if (featureValue === undefined)
    throw new CliUsageError(
      "create plugin requires --template or --features outside an interactive terminal.",
    );
  try {
    assertPluginName(pluginName);
    return {
      name: "create-plugin",
      pluginName,
      directory: directory ?? `extensions/${pluginName}`,
      features: parseCreatePluginFeatures(featureValue),
      tests,
      documentation,
      register,
    };
  } catch (error) {
    throw new CliUsageError(
      error instanceof Error ? error.message : String(error),
    );
  }
}
