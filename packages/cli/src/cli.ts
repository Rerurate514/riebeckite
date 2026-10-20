import {
  isScaffoldPresetName,
  parseScaffoldUtilities,
  SCAFFOLD_DEFAULT_PRESET,
  SCAFFOLD_DEFAULT_UTILITIES,
  SCAFFOLD_PRESETS,
  type ScaffoldDeployment,
  type ScaffoldPresetName,
  ScaffoldSiteError,
  type ScaffoldUtilityName,
  scaffoldDeploymentFromFlags,
} from "create-riebeckite/scaffold";
import { resolveRiebeckiteProject } from "./application_root.js";
import { runBuild } from "./commands/build.js";
import { runCheck } from "./commands/check.js";
import { type CleanScope, runClean } from "./commands/clean.js";
import {
  createHelp,
  runCreateSite,
  runInteractiveCreate,
} from "./commands/create.js";
import {
  runCreateComponent,
  runInteractiveCreateComponent,
} from "./commands/create_component.js";
import {
  assertPagePath,
  assertPageTypeName,
  runCreatePageType,
  runInteractiveCreatePageType,
} from "./commands/create_page_type.js";
import {
  assertPluginName,
  parseCreatePluginFeatures,
  runCreatePlugin,
  runInteractiveCreatePlugin,
} from "./commands/create_plugin.js";
import {
  assertThemeName,
  runCreateTheme,
  runInteractiveCreateTheme,
} from "./commands/create_theme.js";
import { runDeploy } from "./commands/deploy.js";
import { runDeployDomain } from "./commands/deploy_domain.js";
import { runDeploySetup } from "./commands/deploy_setup.js";
import { runDev } from "./commands/dev.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { type InspectTarget, runInspect } from "./commands/inspect.js";
import { runProfile } from "./commands/profile.js";
import { runThemePreview } from "./commands/theme_preview.js";
import { renderCliError } from "./error_renderer.js";
import {
  parseThemeFeatures,
  parseThemeTemplate,
  themeTemplateRegistry,
} from "./theme_generator/registry.js";

export async function main(arguments_: readonly string[]): Promise<void> {
  try {
    const command = parseCommand(arguments_);

    if (command.name === "init") {
      if (command.listPresets) {
        printPresets();
        return;
      }
      await runInit({
        directory: command.directory,
        force: command.force,
        preset: command.preset,
        utilities: command.utilities,
        deployment: command.deployment,
      });
      return;
    }

    if (command.name === "create-help") {
      console.log(createHelp());
      return;
    }
    if (command.name === "create-interactive") {
      await runInteractiveCreate();
      return;
    }
    if (command.name === "create-site") {
      await runCreateSite(command.arguments);
      return;
    }

    if (command.name === "create-plugin") {
      await runCreatePlugin({
        name: command.pluginName,
        directory: command.directory,
        features: command.features,
        tests: command.tests,
        documentation: command.documentation,
        register: command.register,
      });
      return;
    }
    if (command.name === "create-plugin-interactive") {
      await runInteractiveCreatePlugin();
      return;
    }
    if (command.name === "create-theme-list") {
      printThemeTemplates();
      return;
    }
    if (command.name === "create-theme") {
      await runCreateTheme({
        name: command.themeName,
        directory: command.directory,
        template: command.template,
        features: command.features,
        darkMode: command.darkMode,
        tests: command.tests,
        documentation: command.documentation,
        register: command.register,
      });
      return;
    }
    if (command.name === "create-theme-interactive") {
      await runInteractiveCreateTheme();
      return;
    }
    if (command.name === "create-page-type") {
      await runCreatePageType(command.options);
      return;
    }
    if (command.name === "create-page-type-interactive") {
      await runInteractiveCreatePageType();
      return;
    }
    if (command.name === "create-component") {
      await runCreateComponent(command.options);
      return;
    }
    if (command.name === "create-component-interactive") {
      await runInteractiveCreateComponent();
      return;
    }
    if (command.name === "theme-preview") {
      await runThemePreview({
        name: command.themeName,
        port: command.port,
        open: command.open,
      });
      return;
    }

    const project = await resolveRiebeckiteProject(process.cwd());

    if (command.name === "dev") {
      await runDev(project);
      return;
    }
    if (command.name === "build") {
      await runBuild(project, { full: command.full });
      return;
    }
    if (command.name === "clean") {
      await runClean(project, { scope: command.scope });
      return;
    }
    if (command.name === "deploy") {
      await runDeploy(project, { dryRun: command.dryRun });
      return;
    }
    if (command.name === "deploy-setup") {
      await runDeploySetup(project);
      return;
    }
    if (command.name === "deploy-domain") {
      await runDeployDomain(project);
      return;
    }
    if (command.name === "doctor") {
      if (
        !(await runDoctorCommand(project, {
          explain: command.explain,
          json: command.json,
          fix: command.fix,
          dryRun: command.dryRun,
        }))
      )
        process.exitCode = 1;
      return;
    }
    if (command.name === "profile") {
      await runProfile(project, { full: command.full });
      return;
    }
    if (command.name === "inspect") {
      await runInspect(project, {
        target: command.target,
        list: command.list,
      });
      return;
    }

    if (!(await runCheck(project))) process.exitCode = 1;
  } catch (error) {
    console.error(renderCliError(error));
    process.exitCode = 1;
  }
}

type Command =
  | { name: "dev" }
  | { name: "build"; full: boolean }
  | { name: "clean"; scope: CleanScope }
  | { name: "deploy"; dryRun: boolean }
  | { name: "deploy-setup" }
  | { name: "deploy-domain" }
  | { name: "check" }
  | {
      name: "doctor";
      readonly explain: boolean;
      readonly json: boolean;
      readonly fix: boolean;
      readonly dryRun: boolean;
    }
  | {
      name: "init";
      directory: string;
      force: boolean;
      preset: ScaffoldPresetName;
      utilities: readonly ScaffoldUtilityName[];
      listPresets: boolean;
      deployment: ScaffoldDeployment;
    }
  | { name: "profile"; full: boolean }
  | { name: "inspect"; target?: InspectTarget; list: boolean }
  | {
      name: "create-plugin";
      pluginName: string;
      directory: string;
      features: readonly import("./plugin_generator/registry.js").PluginFeatureId[];
      tests: boolean;
      documentation: boolean;
      register: boolean;
    }
  | { name: "create-plugin-interactive" }
  | { name: "create-help" }
  | { name: "create-interactive" }
  | { name: "create-site"; arguments: readonly string[] }
  | { name: "create-theme-list" }
  | {
      name: "create-theme";
      themeName: string;
      directory: string;
      template: import("./theme_generator/registry.js").ThemeTemplateId;
      features: readonly import("./theme_generator/registry.js").ThemeFeatureId[];
      darkMode: boolean;
      tests: boolean;
      documentation: boolean;
      register: boolean;
    }
  | { name: "create-theme-interactive" }
  | {
      name: "create-page-type";
      options: import("./commands/create_page_type.js").CreatePageTypeOptions;
    }
  | { name: "create-page-type-interactive" }
  | {
      name: "create-component";
      options: import("./commands/create_component.js").CreateComponentOptions;
    }
  | { name: "create-component-interactive" }
  | { name: "theme-preview"; themeName: string; port?: number; open: boolean };

export function parseCommand(arguments_: readonly string[]): Command {
  const [name, ...options] = arguments_;
  if (name === "dev" && options.length === 0) return { name };
  if (name === "check" && options.length === 0) return { name };
  if (name === "init") return parseInitCommand(options);
  if (name === "create" && (options[0] === "--help" || options[0] === "-h")) {
    if (options.length !== 1)
      throw new CliUsageError("create --help does not accept other options.");
    return { name: "create-help" };
  }
  if (name === "create" && options.length === 0)
    return { name: "create-interactive" };
  if (name === "create" && options[0] === "site")
    return { name: "create-site", arguments: options.slice(1) };
  if (name === "create" && options[0] === "plugin")
    return parseCreatePluginCommand(options.slice(1));
  if (name === "create" && options[0] === "theme")
    return parseCreateThemeCommand(options.slice(1));
  if (name === "create" && options[0] === "page-type")
    return parseCreatePageTypeCommand(options.slice(1));
  if (name === "create" && options[0] === "component")
    return parseCreateComponentCommand(options.slice(1));
  if (name === "theme" && options[0] === "preview")
    return parseThemePreviewCommand(options.slice(1));
  if (
    name === "build" &&
    (options.length === 0 || (options.length === 1 && options[0] === "--full"))
  ) {
    return { name, full: options[0] === "--full" };
  }
  if (name === "clean") {
    if (options.length === 0) return { name, scope: "state" };
    if (options.length === 1 && options[0] === "--output") {
      return { name, scope: "output" };
    }
    if (options.length === 1 && options[0] === "--all") {
      return { name, scope: "all" };
    }
  }
  if (name === "deploy") {
    if (options.length === 0) return { name, dryRun: false };
    if (options.length === 1 && options[0] === "--dry-run") {
      return { name, dryRun: true };
    }
    if (options.length === 1 && options[0] === "setup") {
      return { name: "deploy-setup" };
    }
    if (options.length === 1 && options[0] === "domain") {
      return { name: "deploy-domain" };
    }
  }
  if (name === "inspect") return parseInspectCommand(options);
  if (name === "doctor") {
    return parseDoctorCommand(options);
  }
  if (
    name === "profile" &&
    (options.length === 0 || (options.length === 1 && options[0] === "--full"))
  ) {
    return { name, full: options[0] === "--full" };
  }

  throw new CliUsageError(
    "Usage: riebeckite <create [site | plugin | theme | page-type | component] | theme preview <name> [--port <port>] [--no-open] | init [directory] [--preset <name>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>] | dev | build [--full] | clean [--output | --all] | deploy [--dry-run | setup | domain] | check | doctor [--explain | --json | --fix [--dry-run]] | profile [--full] | inspect [config | plugins | content [--list] | graph | build]>",
  );
}

function parseDoctorCommand(options: readonly string[]): Command {
  const values = new Set(options);
  if (values.size !== options.length)
    throw new CliUsageError("Duplicate doctor option.");
  for (const option of values) {
    if (!["--explain", "--json", "--fix", "--dry-run"].includes(option)) {
      throw new CliUsageError(`Unknown doctor option: ${option}.`);
    }
  }
  const fix = values.has("--fix");
  const dryRun = values.has("--dry-run");
  if (dryRun && !fix) throw new CliUsageError("--dry-run requires --fix.");
  if (values.has("--json") && values.has("--explain")) {
    throw new CliUsageError("--json cannot be combined with --explain.");
  }
  if (values.has("--json") && fix) {
    throw new CliUsageError("--json cannot be combined with --fix.");
  }
  return {
    name: "doctor",
    explain: values.has("--explain"),
    json: values.has("--json"),
    fix,
    dryRun,
  };
}

function parseCreatePageTypeCommand(options: readonly string[]): Command {
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

function parseCreateComponentCommand(options: readonly string[]): Command {
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

function parseThemePreviewCommand(options: readonly string[]): Command {
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

function parseCreateThemeCommand(options: readonly string[]): Command {
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

function printThemeTemplates(): void {
  for (const template of Object.values(themeTemplateRegistry)) {
    console.log(`${template.id}: ${template.description}`);
  }
}

function parseCreatePluginCommand(options: readonly string[]): Command {
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

const INIT_USAGE =
  "Usage: riebeckite init [directory] [--preset <name>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>]";

function parseInitCommand(options: readonly string[]): Command {
  let directory: string | undefined;
  let force = false;
  let listPresets = false;
  let preset: ScaffoldPresetName | undefined;
  let utilities: readonly ScaffoldUtilityName[] | undefined;
  let githubActions = false;
  let cloudflareWorkers = false;
  let contentRepository: string | undefined;
  let siteRepository: string | undefined;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--force") {
      force = true;
      continue;
    }
    if (option === "--list-presets") {
      listPresets = true;
      continue;
    }
    if (option === "--github-actions") {
      githubActions = true;
      continue;
    }
    if (option === "--cloudflare-workers") {
      cloudflareWorkers = true;
      continue;
    }
    if (option === "--preset") {
      const value = options[index + 1];
      if (value === undefined || !isScaffoldPresetName(value)) {
        throw new CliUsageError(
          `Unknown preset: ${value ?? "(missing)"}. ` +
            `Available presets: ${SCAFFOLD_PRESETS.map((entry) => entry.name).join(", ")}.`,
        );
      }
      preset = value;
      index += 1;
      continue;
    }
    if (option === "--utilities") {
      const value = options[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new CliUsageError(
          "--utilities requires a comma-separated list of utility names.",
        );
      }
      try {
        utilities = parseScaffoldUtilities(value);
      } catch (error) {
        throw new CliUsageError(
          error instanceof Error ? error.message : String(error),
        );
      }
      index += 1;
      continue;
    }
    if (option === "--content-repository" || option === "--site-repository") {
      const value = options[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new CliUsageError(
          `${option} requires an owner/repository value.`,
        );
      }
      if (option === "--content-repository") {
        contentRepository = value;
      } else {
        siteRepository = value;
      }
      index += 1;
      continue;
    }
    if (option.startsWith("-")) {
      throw new CliUsageError(`Unknown init option: ${option}`);
    }
    if (directory !== undefined) {
      throw new CliUsageError(INIT_USAGE);
    }
    directory = option;
  }

  let deployment: ScaffoldDeployment;
  try {
    deployment = scaffoldDeploymentFromFlags({
      githubActions,
      cloudflareWorkers,
      contentRepository,
      siteRepository,
    });
  } catch (error) {
    if (error instanceof ScaffoldSiteError) {
      throw new CliUsageError(error.message);
    }
    throw error;
  }

  return {
    name: "init",
    directory: directory ?? ".",
    force,
    preset: preset ?? SCAFFOLD_DEFAULT_PRESET,
    utilities: utilities ?? SCAFFOLD_DEFAULT_UTILITIES,
    listPresets,
    deployment,
  };
}

function printPresets(): void {
  console.log("Available presets:");
  console.log("");
  for (const { name, description } of SCAFFOLD_PRESETS) {
    console.log(`  ${name}: ${description}`);
  }
}

function parseInspectCommand(options: readonly string[]): Command {
  if (options.length === 0) return { name: "inspect", list: false };
  if (options.length === 1 && isInspectTarget(options[0])) {
    return { name: "inspect", target: options[0], list: false };
  }
  if (
    options.length === 2 &&
    options[0] === "content" &&
    options[1] === "--list"
  ) {
    return { name: "inspect", target: "content", list: true };
  }

  const target = options[0] ?? "";
  if (target && !isInspectTarget(target)) {
    throw new CliUsageError(
      `Unknown inspect target: ${target}\n\nAvailable:\n  config\n  plugins\n  content\n  graph\n  build`,
    );
  }
  throw new CliUsageError(
    "Usage: riebeckite inspect [config | plugins | content [--list] | graph | build]",
  );
}

function isInspectTarget(value: string | undefined): value is InspectTarget {
  return (
    value === "config" ||
    value === "plugins" ||
    value === "content" ||
    value === "graph" ||
    value === "build"
  );
}

class CliUsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliUsageError";
  }
}
