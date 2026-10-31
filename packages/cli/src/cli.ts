import {
  isScaffoldPresetName,
  parseScaffoldFeatures,
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
import { CliUsageError } from "./cli_usage_error.js";
import { runCommand } from "./command_dispatcher.js";
import type { CleanScope } from "./commands/clean.js";
import type { InspectTarget } from "./commands/inspect.js";
import { renderCliError } from "./error_renderer.js";
import {
  parseCreateComponentCommand,
  parseCreatePageTypeCommand,
  parseCreatePluginCommand,
  parseCreateThemeCommand,
  parsePluginDevCommand,
  parsePluginVerifyCommand,
  parseThemePreviewCommand,
} from "./interactive_command_parser.js";

export async function main(arguments_: readonly string[]): Promise<void> {
  try {
    await runCommand(parseCommand(arguments_));
  } catch (error) {
    console.error(renderCliError(error));
    process.exitCode = 1;
  }
}

export type Command =
  | { name: "dev" }
  | { name: "build"; full: boolean }
  | { name: "clean"; scope: CleanScope }
  | {
      name: "publish";
      options: import("./commands/publish.js").PublishCommandOptions;
    }
  | { name: "deploy-setup" }
  | { name: "deploy-domain" }
  | { name: "check" }
  | {
      name: "doctor";
      readonly explain: boolean;
      readonly json: boolean;
      readonly fix: boolean;
      readonly dryRun: boolean;
      readonly failOn?: "error" | "warning" | "info";
      readonly codes: readonly string[];
    }
  | {
      name: "init";
      directory: string;
      force: boolean;
      preset: ScaffoldPresetName;
      features?: readonly import("create-riebeckite/scaffold").ScaffoldFeatureName[];
      utilities: readonly ScaffoldUtilityName[];
      listPresets: boolean;
      deployment: ScaffoldDeployment;
    }
  | { name: "profile"; full: boolean }
  | { name: "upgrade"; check: true; to: string; json: boolean }
  | {
      name: "inspect";
      target?: InspectTarget;
      list: boolean;
      path?: string;
      json: boolean;
      source?: string;
      output?: string;
      compare?: string;
    }
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
  | { name: "theme-preview"; themeName: string; port?: number; open: boolean }
  | { name: "plugin-dev"; pluginPath: string; port?: number; open: boolean }
  | {
      name: "plugin-verify";
      pluginPath: string;
      level: import("@riebeckite/test/plugin-contract").PluginContractLevel;
      json: boolean;
    };

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
  if (name === "plugin" && options[0] === "dev")
    return parsePluginDevCommand(options.slice(1));
  if (name === "plugin" && options[0] === "verify")
    return parsePluginVerifyCommand(options.slice(1));
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
    if (options.length === 1 && options[0] === "setup") {
      return { name: "deploy-setup" };
    }
    if (options.length === 1 && options[0] === "domain") {
      return { name: "deploy-domain" };
    }
  }
  if (name === "publish") return parsePublishCommand(options);
  if (name === "inspect") return parseInspectCommand(options);
  if (name === "doctor") {
    return parseDoctorCommand(options);
  }
  if (name === "upgrade") return parseUpgradeCommand(options);
  if (
    name === "profile" &&
    (options.length === 0 || (options.length === 1 && options[0] === "--full"))
  ) {
    return { name, full: options[0] === "--full" };
  }

  throw new CliUsageError(
    "Usage: riebeckite <create [site | plugin | theme | page-type | component] | theme preview <name> [--port <port>] [--no-open] | plugin dev <path> [--port <port>] [--no-open] | plugin verify <path> [--level basic|integration|full] [--json] | init [directory] [--preset <name>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>] | dev | build [--full] | clean [--output | --all] | deploy setup | deploy domain | publish <plan | status | validate | run | approve | revoke | record | gate> [options] | check | doctor [--explain | --json | --fix [--dry-run] | --fail-on <severity> | --code <code>] | upgrade --check --to <version|latest> [--json] | profile [--full] | inspect [config | plugins | content [--list] | graph | build]>",
  );
}

const PUBLISH_USAGE =
  "Usage: riebeckite publish <plan|status|validate|run|approve|revoke|record|gate> [--json] [--at <iso>] [--provider <name>] [--approvals <path>] [--require-approval] | publish run [--execute] [--force] [--trigger <manual|scheduled|ci|cli>] | publish approve|revoke <slug...> [--all] [--by <name>] | publish record --provider <name> | publish gate --provider <name>";

function parsePublishCommand(options: readonly string[]): Command {
  const [action, ...rest] = options;
  if (
    action !== "plan" &&
    action !== "status" &&
    action !== "validate" &&
    action !== "run" &&
    action !== "approve" &&
    action !== "revoke" &&
    action !== "record" &&
    action !== "gate"
  ) {
    throw new CliUsageError(PUBLISH_USAGE);
  }

  let json = false;
  let at: string | undefined;
  let provider: import("@riebeckite/core").HostingProvider | undefined;
  let approvals: string | undefined;
  let workflow: "direct" | "approved" | undefined;
  let execute = false;
  let force = false;
  let trigger: import("@riebeckite/core").PublicationRunTrigger = "cli";
  let all = false;
  let approvedBy: string | undefined;
  const slugs: string[] = [];

  for (let index = 0; index < rest.length; index += 1) {
    const option = rest[index];
    if (option === "--json") {
      if (json) throw new CliUsageError("Duplicate publish option: --json.");
      json = true;
      continue;
    }
    if (option === "--at") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-") || Number.isNaN(Date.parse(value))) {
        throw new CliUsageError("--at requires an ISO 8601 date.");
      }
      if (at !== undefined)
        throw new CliUsageError("Duplicate publish option: --at.");
      if (action === "run") {
        throw new CliUsageError(
          "--at is only valid for publish plan, status, validate, or gate.",
        );
      }
      at = value;
      index += 1;
      continue;
    }
    if (option === "--provider") {
      const value = rest[index + 1];
      if (
        value !== "github-pages" &&
        value !== "cloudflare-workers" &&
        value !== "cloudflare-pages" &&
        value !== "netlify" &&
        value !== "vercel"
      ) {
        throw new CliUsageError(
          "--provider requires github-pages, cloudflare-workers, cloudflare-pages, netlify, or vercel.",
        );
      }
      if (provider !== undefined)
        throw new CliUsageError("Duplicate publish option: --provider.");
      provider = value;
      index += 1;
      continue;
    }
    if (option === "--approvals") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-")) {
        throw new CliUsageError("--approvals requires a file path.");
      }
      if (approvals !== undefined)
        throw new CliUsageError("Duplicate publish option: --approvals.");
      approvals = value;
      index += 1;
      continue;
    }
    if (option === "--require-approval") {
      workflow = "approved";
      continue;
    }
    if (option === "--execute") {
      if (action !== "run") {
        throw new CliUsageError("--execute is only valid for publish run.");
      }
      execute = true;
      continue;
    }
    if (option === "--force") {
      if (action !== "run") {
        throw new CliUsageError("--force is only valid for publish run.");
      }
      force = true;
      continue;
    }
    if (option === "--trigger") {
      const value = rest[index + 1];
      if (
        value !== "manual" &&
        value !== "scheduled" &&
        value !== "ci" &&
        value !== "cli"
      ) {
        throw new CliUsageError(
          "--trigger requires manual, scheduled, ci, or cli.",
        );
      }
      trigger = value;
      index += 1;
      continue;
    }
    if (option === "--all") {
      if (action !== "approve" && action !== "revoke") {
        throw new CliUsageError(
          "--all is only valid for publish approve or revoke.",
        );
      }
      all = true;
      continue;
    }
    if (option === "--by") {
      const value = rest[index + 1];
      if (!value || value.startsWith("-")) {
        throw new CliUsageError("--by requires a name.");
      }
      approvedBy = value;
      index += 1;
      continue;
    }
    if (
      (action === "approve" || action === "revoke") &&
      !option.startsWith("-")
    ) {
      slugs.push(option);
      continue;
    }
    throw new CliUsageError(`Unknown publish option: ${option}.`);
  }

  if (
    (action === "approve" || action === "revoke") &&
    slugs.length === 0 &&
    !all
  ) {
    throw new CliUsageError(
      `Pass one or more note slugs or --all to publish ${action}.`,
    );
  }

  return {
    name: "publish",
    options: {
      action,
      json,
      ...(at === undefined ? {} : { at }),
      ...(provider === undefined ? {} : { provider }),
      ...(approvals === undefined ? {} : { approvals }),
      ...(workflow === undefined ? {} : { workflow }),
      execute,
      force,
      trigger,
      slugs,
      all,
      ...(approvedBy === undefined ? {} : { approvedBy }),
    },
  };
}

function parseUpgradeCommand(options: readonly string[]): Command {
  let check = false;
  let to: string | undefined;
  let json = false;
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--check") {
      if (check) throw new CliUsageError("Duplicate upgrade option: --check.");
      check = true;
      continue;
    }
    if (option === "--json") {
      if (json) throw new CliUsageError("Duplicate upgrade option: --json.");
      json = true;
      continue;
    }
    if (option === "--to") {
      const value = options[index + 1];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--to requires a version or latest.");
      if (to) throw new CliUsageError("Duplicate upgrade option: --to.");
      to = value;
      index += 1;
      continue;
    }
    throw new CliUsageError(`Unknown upgrade option: ${option}.`);
  }
  if (!check || !to)
    throw new CliUsageError(
      "Usage: riebeckite upgrade --check --to <version|latest> [--json]",
    );
  return { name: "upgrade", check: true, to, json };
}

function parseDoctorCommand(options: readonly string[]): Command {
  let explain = false;
  let json = false;
  let fix = false;
  let dryRun = false;
  let failOn: "error" | "warning" | "info" | undefined;
  const codes: string[] = [];
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    if (option === "--explain") {
      if (explain)
        throw new CliUsageError("Duplicate doctor option: --explain.");
      explain = true;
    } else if (option === "--json") {
      if (json) throw new CliUsageError("Duplicate doctor option: --json.");
      json = true;
    } else if (option === "--fix") {
      if (fix) throw new CliUsageError("Duplicate doctor option: --fix.");
      fix = true;
    } else if (option === "--dry-run") {
      if (dryRun)
        throw new CliUsageError("Duplicate doctor option: --dry-run.");
      dryRun = true;
    } else if (option === "--fail-on") {
      const value = options[++index];
      if (value !== "error" && value !== "warning" && value !== "info")
        throw new CliUsageError("--fail-on requires error, warning, or info.");
      if (failOn)
        throw new CliUsageError("Duplicate doctor option: --fail-on.");
      failOn = value;
    } else if (option === "--code") {
      const value = options[++index];
      if (!value || value.startsWith("-"))
        throw new CliUsageError("--code requires a diagnostic code.");
      codes.push(value);
    } else throw new CliUsageError(`Unknown doctor option: ${option}.`);
  }
  if (dryRun && !fix) throw new CliUsageError("--dry-run requires --fix.");
  if (json && explain) {
    throw new CliUsageError("--json cannot be combined with --explain.");
  }
  if (json && fix) {
    throw new CliUsageError("--json cannot be combined with --fix.");
  }
  return {
    name: "doctor",
    explain,
    json,
    fix,
    dryRun,
    failOn,
    codes,
  };
}

const INIT_USAGE =
  "Usage: riebeckite init [directory] [--preset <name>] [--features <names>] [--utilities <names>] [--force] [--list-presets] [--github-actions | --cloudflare-workers] [--content-repository <owner/repo>] [--site-repository <owner/repo>]";

function parseInitCommand(options: readonly string[]): Command {
  let directory: string | undefined;
  let force = false;
  let listPresets = false;
  let preset: ScaffoldPresetName | undefined;
  let features:
    | readonly import("create-riebeckite/scaffold").ScaffoldFeatureName[]
    | undefined;
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
    if (option === "--features") {
      const value = options[index + 1];
      if (value === undefined || value.startsWith("-")) {
        throw new CliUsageError(
          "--features requires a comma-separated list of feature names.",
        );
      }
      try {
        features = parseScaffoldFeatures(value);
      } catch (error) {
        throw new CliUsageError(
          error instanceof Error ? error.message : String(error),
        );
      }
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
    ...(features ? { features } : {}),
    utilities: utilities ?? SCAFFOLD_DEFAULT_UTILITIES,
    listPresets,
    deployment,
  };
}

function parseInspectCommand(options: readonly string[]): Command {
  if (options.length === 0)
    return { name: "inspect", list: false, json: false };
  if (options.length === 1 && isInspectTarget(options[0])) {
    return { name: "inspect", target: options[0], list: false, json: false };
  }
  if (options[0] === "content") {
    let list = false;
    let path: string | undefined;
    for (let index = 1; index < options.length; index += 1) {
      const option = options[index];
      if (option === "--list" && !list) {
        list = true;
        continue;
      }
      if (option === "--path" && path === undefined) {
        const value = options[index + 1];
        if (value === undefined || value.startsWith("-")) {
          throw new CliUsageError(
            "--path requires a content path or permalink.",
          );
        }
        path = value;
        index += 1;
        continue;
      }
      throw new CliUsageError(
        "Usage: riebeckite inspect content [--list] [--path <path-or-permalink>]",
      );
    }
    return {
      name: "inspect",
      target: "content",
      list,
      json: false,
      ...(path ? { path } : {}),
    };
  }

  if (options[0] === "provenance") {
    let json = false;
    let source: string | undefined;
    let output: string | undefined;
    let compare: string | undefined;
    for (let index = 1; index < options.length; index += 1) {
      const option = options[index];
      if (option === "--json" && !json) {
        json = true;
        continue;
      }
      if (
        option === "--source" ||
        option === "--output" ||
        option === "--compare"
      ) {
        const value = options[index + 1];
        if (!value || value.startsWith("-")) {
          throw new CliUsageError(`${option} requires a value.`);
        }
        if (option === "--source" && source === undefined) source = value;
        else if (option === "--output" && output === undefined) output = value;
        else if (option === "--compare" && compare === undefined)
          compare = value;
        else throw new CliUsageError(`Duplicate provenance option: ${option}.`);
        index += 1;
        continue;
      }
      throw new CliUsageError(
        "Usage: riebeckite inspect provenance [--json] [--source <path>] [--output <path>] [--compare <build-id>]",
      );
    }
    return {
      name: "inspect",
      target: "provenance",
      list: false,
      json,
      ...(source === undefined ? {} : { source }),
      ...(output === undefined ? {} : { output }),
      ...(compare === undefined ? {} : { compare }),
    };
  }

  const target = options[0] ?? "";
  if (target && !isInspectTarget(target)) {
    throw new CliUsageError(
      `Unknown inspect target: ${target}\n\nAvailable:\n  config\n  plugins\n  content\n  graph\n  build\n  provenance`,
    );
  }
  throw new CliUsageError(
    "Usage: riebeckite inspect [config | plugins | content [--list] [--path <path-or-permalink>] | graph | build | provenance [--json] [--source <path>] [--output <path>] [--compare <build-id>]]",
  );
}

function isInspectTarget(value: string | undefined): value is InspectTarget {
  return (
    value === "config" ||
    value === "plugins" ||
    value === "content" ||
    value === "graph" ||
    value === "build" ||
    value === "provenance"
  );
}
