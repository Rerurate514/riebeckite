import {
  type CliCommandContext,
  type CliCommandDefinition,
  type CliCommandInput,
  type CliCommandRegistry,
  type CliOptionDefinition,
  CliUsageError,
  cliArgument,
  cliBoolean,
  cliEnum,
  cliExample,
  cliNumber,
  cliString,
  cliVariadicArgument,
  createCliCommandRegistry,
  defineCliCommand,
  registerCliCommand,
} from "@riebeckite/core";
import {
  formatPathHelp,
  formatRootHelp,
  generateCompletion,
} from "@riebeckite/core/cli";
import type { RiebeckiteProject } from "../application_root.js";
import type { MigrateAction } from "../commands/migrate.js";
import type {
  PublishAction,
  PublishCommandOptions,
} from "../commands/publish.js";
import {
  PLUGIN_FEATURE_IDS,
  parsePluginFeatures,
} from "../plugin_generator/registry.js";
import {
  parseThemeFeatures,
  parseThemeTemplate,
  THEME_FEATURE_IDS,
  THEME_TEMPLATE_IDS,
  themeTemplateRegistry,
} from "../theme_generator/registry.js";

const MIGRATE_ACTIONS: readonly MigrateAction[] = [
  "list",
  "plan",
  "apply",
  "status",
  "history",
  "rollback",
  "recover",
];

const PUBLISH_PROVIDERS = [
  "github-pages",
  "cloudflare-workers",
  "cloudflare-pages",
  "netlify",
  "vercel",
] as const;
const PUBLISH_ACTIONS = [
  "plan",
  "status",
  "validate",
  "run",
  "approve",
  "revoke",
  "record",
  "gate",
] as const;
const PUBLISH_JSON = cliBoolean("json", {
  description: "Print the result as JSON.",
  short: "j",
});
const PUBLISH_AT = cliString("at", {
  description: "Use the project state at an ISO-8601 timestamp.",
  valueName: "timestamp",
  validate: validateIsoTimestamp,
});
const PUBLISH_PROVIDER = cliEnum("provider", PUBLISH_PROVIDERS, {
  description: "Publication provider to inspect or record.",
  valueName: "provider",
});
const PUBLISH_APPROVALS = cliString("approvals", {
  description: "Approval file path.",
  valueName: "path",
});
const PUBLISH_REQUIRE_APPROVAL = cliBoolean("require-approval", {
  description: "Record the workflow as approved before running.",
});
const PUBLISH_STATE_FILE = cliString("state-file", {
  description: "Durable publication state path.",
  valueName: "path",
});
const PUBLISH_TRIGGER = cliEnum(
  "trigger",
  ["manual", "scheduled", "ci", "cli"],
  {
    description: "Publication trigger.",
    default: "cli",
  },
);
const PUBLISH_SLUGS = cliVariadicArgument("slug", {
  description: "Publication slugs.",
});

const themeFeatureOption = cliString("features", {
  description: "Comma-separated Theme feature names.",
  valueName: "names",
  validate: validateCommaSeparated(THEME_FEATURE_IDS, "theme feature"),
});
const pluginFeatureOption = cliString("features", {
  description: "Comma-separated Plugin feature names.",
  valueName: "names",
  validate: validateCommaSeparated(PLUGIN_FEATURE_IDS, "plugin feature"),
});

export function createBuiltinRegistry(): CliCommandRegistry {
  return definitions().reduce(
    (registry, definition) => registerCliCommand(registry, definition),
    createCliCommandRegistry(),
  );
}

function definitions(): readonly CliCommandDefinition[] {
  return [
    devCommand(),
    buildCommand(),
    cleanCommand(),
    checkCommand(),
    doctorCommand(),
    profileCommand(),
    upgradeCommand(),
    initCommand(),
    inspectCommand(),
    inspectConfigCommand(),
    inspectPluginsCommand(),
    inspectContentCommand(),
    inspectGraphCommand(),
    inspectBuildCommand(),
    inspectAssetsCommand(),
    inspectProvenanceCommand(),
    inspectApiCommand(),
    createCommand(),
    createSiteCommand(),
    createPluginCommand(),
    createThemeCommand(),
    createPageTypeCommand(),
    createComponentCommand(),
    themeGroupCommand(),
    themePreviewCommand(),
    pluginGroupCommand(),
    pluginDevCommand(),
    pluginVerifyCommand(),
    contentCommand(),
    bridgeApproveCommand(),
    migrateGroupCommand(),
    ...MIGRATE_ACTIONS.map(migrateActionCommand),
    publishGroupCommand(),
    ...PUBLISH_ACTIONS.map(publishActionCommand),
    deployGroupCommand(),
    deploySetupCommand(),
    deployWorkflowCommand(),
    deployDomainCommand(),
    helpCommand(),
    completionCommand(),
  ];
}

function devCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "dev",
    summary: "Start the development server.",
    requiresProject: true,
    options: [
      cliString("bridge-token", {
        description:
          "Enable the local Bridge API with this pairing token (at least 32 characters).",
      }),
    ],
    examples: [cliExample("riebeckite dev")],
    validate(input) {
      const token = input.options.bridgeToken;
      return typeof token === "string" && token.length < 32
        ? "--bridge-token must be at least 32 characters."
        : undefined;
    },
    async handler(context, input) {
      const { runDev } = await import("../commands/dev.js");
      await runDev(await project(context), {
        bridgeToken: input.options.bridgeToken,
      });
    },
  });
}

function buildCommand(): CliCommandDefinition {
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

function cleanCommand(): CliCommandDefinition {
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

function checkCommand(): CliCommandDefinition {
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

function doctorCommand(): CliCommandDefinition {
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
        failOn: input.options.failOn as
          | "error"
          | "warning"
          | "info"
          | undefined,
        codes: (input.options.code as readonly string[] | undefined) ?? [],
      });
    },
  });
}

function profileCommand(): CliCommandDefinition {
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

function upgradeCommand(): CliCommandDefinition {
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
        to: input.options.to as string,
        json: input.options.json as boolean,
      });
    },
  });
}

function initCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "init",
    summary: "Create a new Riebeckite site.",
    arguments: [
      cliArgument("directory", {
        description: "Target directory.",
        default: ".",
      }),
    ],
    options: [
      cliString("preset", {
        description: "Starter preset.",
        valueName: "name",
      }),
      cliString("features", {
        description: "Comma-separated scaffold feature names.",
        valueName: "names",
      }),
      cliString("utilities", {
        description: "Comma-separated utility file names.",
        valueName: "names",
      }),
      cliBoolean("force", { description: "Write into a non-empty directory." }),
      cliBoolean("list-presets", {
        description: "List available presets and exit.",
      }),
      cliBoolean("github-actions", {
        description: "Add the GitHub Actions deployment workflow.",
      }),
      cliBoolean("cloudflare-workers", {
        description: "Add the Cloudflare Workers deployment workflow.",
      }),
      cliString("content-repository", {
        description: "External content repository (owner/repository).",
        valueName: "owner/repository",
      }),
      cliString("site-repository", {
        description: "Site repository (owner/repository).",
        valueName: "owner/repository",
      }),
    ],
    examples: [
      cliExample("riebeckite init my-site --preset starter"),
      cliExample("riebeckite init --list-presets"),
    ],
    async handler(context, input) {
      if (input.options.listPresets === true) {
        const { SCAFFOLD_PRESETS } = await import("create-riebeckite/scaffold");
        context.output.writeLine("Available presets:");
        context.output.writeLine();
        for (const preset of SCAFFOLD_PRESETS) {
          context.output.writeLine(`  ${preset.name}: ${preset.description}`);
        }
        return;
      }
      const scaffold = await import("create-riebeckite/scaffold");
      try {
        const presetName = input.options.preset;
        if (
          typeof presetName === "string" &&
          !scaffold.isScaffoldPresetName(presetName)
        ) {
          throw new Error(
            `Unknown preset: ${presetName}. Available presets: ${scaffold.SCAFFOLD_PRESETS.map((preset) => preset.name).join(", ")}.`,
          );
        }
        const { runInit } = await import("../commands/init.js");
        await runInit({
          directory: input.arguments.directory as string,
          force: input.options.force as boolean,
          preset:
            (presetName as
              | import("create-riebeckite/scaffold").ScaffoldPresetName
              | undefined) ?? scaffold.SCAFFOLD_DEFAULT_PRESET,
          ...(typeof input.options.features === "string"
            ? {
                features: scaffold.parseScaffoldFeatures(
                  input.options.features,
                ),
              }
            : {}),
          utilities:
            typeof input.options.utilities === "string"
              ? scaffold.parseScaffoldUtilities(input.options.utilities)
              : scaffold.SCAFFOLD_DEFAULT_UTILITIES,
          deployment: scaffold.scaffoldDeploymentFromFlags({
            githubActions: input.options.githubActions === true,
            cloudflareWorkers: input.options.cloudflareWorkers === true,
            ...(typeof input.options.contentRepository === "string"
              ? { contentRepository: input.options.contentRepository }
              : {}),
            ...(typeof input.options.siteRepository === "string"
              ? { siteRepository: input.options.siteRepository }
              : {}),
          }),
        });
      } catch (error) {
        if (error instanceof CliUsageError) throw error;
        throw new CliUsageError(
          error instanceof Error ? error.message : String(error),
        );
      }
    },
  });
}

function inspectCommand(): CliCommandDefinition {
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

function inspectTargetCommand(
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

function inspectConfigCommand(): CliCommandDefinition {
  return inspectTargetCommand("config");
}

function inspectPluginsCommand(): CliCommandDefinition {
  return inspectTargetCommand("plugins");
}

function inspectGraphCommand(): CliCommandDefinition {
  return inspectTargetCommand("graph");
}

function inspectBuildCommand(): CliCommandDefinition {
  return inspectTargetCommand("build");
}

function inspectContentCommand(): CliCommandDefinition {
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

function inspectAssetsCommand(): CliCommandDefinition {
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

function inspectProvenanceCommand(): CliCommandDefinition {
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

function inspectApiCommand(): CliCommandDefinition {
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

function createCommand(): CliCommandDefinition {
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

function createSiteCommand(): CliCommandDefinition {
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

const pluginNameArgument = cliArgument("name", {
  description: "Plugin name.",
  validate: validateKebabName("Plugin name"),
});
const pluginDirectoryOption = cliString("directory", {
  description: "Target directory.",
  valueName: "path",
});

function createPluginCommand(): CliCommandDefinition {
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

function createThemeCommand(): CliCommandDefinition {
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

function createPageTypeCommand(): CliCommandDefinition {
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

function createComponentCommand(): CliCommandDefinition {
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

function themeGroupCommand(): CliCommandDefinition {
  return groupCommand("theme", "Preview a local Theme.");
}

function themePreviewCommand(): CliCommandDefinition {
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

function pluginGroupCommand(): CliCommandDefinition {
  return groupCommand("plugin", "Develop and verify local Plugins.");
}

function pluginDevCommand(): CliCommandDefinition {
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

function pluginVerifyCommand(): CliCommandDefinition {
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

function contentCommand(): CliCommandDefinition {
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

function bridgeApproveCommand(): CliCommandDefinition {
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

const MIGRATE_JSON = cliBoolean("json", {
  description: "Write machine-readable JSON to stdout.",
});
const MIGRATE_APPLY = cliBoolean("apply", {
  description: "Write the changes instead of printing a dry run.",
});
const MIGRATE_IDS = cliString("id", {
  description: "Limit the command to a migration ID.",
  repeatable: true,
  valueName: "id",
});
const MIGRATE_TARGET = cliArgument("target", {
  description: "Plan ID or migration ID to roll back.",
  required: true,
});

function migrateGroupCommand(): CliCommandDefinition {
  return groupCommand(
    "migrate",
    "Plan, apply, or roll back versioned content migrations.",
  );
}

function migrateActionCommand(action: MigrateAction): CliCommandDefinition {
  return defineCliCommand({
    id: `migrate ${action}`,
    summary: MIGRATE_SUMMARIES[action],
    requiresProject: true,
    supportsJson: true,
    arguments: action === "rollback" ? [MIGRATE_TARGET] : [],
    options: MIGRATE_OPTIONS(action),
    examples: [cliExample(MIGRATE_EXAMPLES[action])],
    async handler(context, input) {
      const { runMigrate } = await import("../commands/migrate.js");
      const options = input.options as Readonly<Record<string, unknown>>;
      const outcome = await runMigrate(
        await project(context),
        action,
        {
          ids: Array.isArray(options.id)
            ? options.id.filter((id): id is string => typeof id === "string")
            : [],
          apply: options.apply === true,
          plan: textValue(options.plan),
          out: textValue(options.out),
          limit: typeof options.limit === "number" ? options.limit : undefined,
          journal: textValue(options.journal),
          target: textValue(input.arguments.target),
        },
        context.signal,
      );
      if (!context.json) context.output.writeLine(outcome.text);
      return { exitCode: outcome.ok ? 0 : 1, json: outcome.json };
    },
  });
}

function MIGRATE_OPTIONS(
  action: MigrateAction,
): readonly CliOptionDefinition[] {
  if (action === "plan")
    return [
      MIGRATE_IDS,
      cliString("out", {
        description: "Write the plan to a file.",
        valueName: "path",
      }),
      MIGRATE_JSON,
    ];
  if (action === "apply")
    return [
      cliString("plan", {
        description: "Apply a saved migration plan.",
        valueName: "path",
      }),
      MIGRATE_IDS,
      MIGRATE_APPLY,
      MIGRATE_JSON,
    ];
  if (action === "history")
    return [
      cliNumber("limit", {
        description: "Maximum number of runs to list.",
        integer: true,
        min: 0,
      }),
      MIGRATE_JSON,
    ];
  if (action === "rollback") return [MIGRATE_APPLY, MIGRATE_JSON];
  if (action === "recover")
    return [
      cliString("journal", {
        description: "Recover a specific mutation journal.",
        valueName: "path",
      }),
      MIGRATE_IDS,
      MIGRATE_APPLY,
      MIGRATE_JSON,
    ];
  return [MIGRATE_JSON];
}

const MIGRATE_SUMMARIES: Readonly<Record<MigrateAction, string>> = {
  list: "List content migrations and their applied state.",
  plan: "Plan the pending content migrations without writing.",
  apply: "Apply pending content migrations.",
  status: "Show the applied content migration state.",
  history: "Show the content migration history.",
  rollback: "Roll back an applied migration.",
  recover: "Recover an interrupted content migration.",
};

const MIGRATE_EXAMPLES: Readonly<Record<MigrateAction, string>> = {
  list: "riebeckite migrate list",
  plan: "riebeckite migrate plan --id legacy --out migration-plan.json",
  apply: "riebeckite migrate apply --apply",
  status: "riebeckite migrate status --json",
  history: "riebeckite migrate history --limit 10",
  rollback: "riebeckite migrate rollback <planId> --apply",
  recover: "riebeckite migrate recover --apply",
};

function textValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function publishGroupCommand(): CliCommandDefinition {
  return groupCommand(
    "publish",
    "Plan, validate, approve, or publish a build.",
  );
}

function publishActionCommand(action: PublishAction): CliCommandDefinition {
  const common = [
    PUBLISH_JSON,
    PUBLISH_AT,
    PUBLISH_PROVIDER,
    PUBLISH_APPROVALS,
    PUBLISH_REQUIRE_APPROVAL,
    PUBLISH_STATE_FILE,
  ];
  const options: readonly CliOptionDefinition[] =
    action === "run"
      ? [
          PUBLISH_JSON,
          PUBLISH_PROVIDER,
          PUBLISH_APPROVALS,
          PUBLISH_REQUIRE_APPROVAL,
          PUBLISH_STATE_FILE,
          cliBoolean("execute", { description: "Execute the publication." }),
          cliBoolean("force", { description: "Force the publication." }),
          PUBLISH_TRIGGER,
        ]
      : action === "record"
        ? [...common, PUBLISH_TRIGGER]
        : action === "approve" || action === "revoke"
          ? [
              PUBLISH_JSON,
              PUBLISH_AT,
              PUBLISH_APPROVALS,
              PUBLISH_REQUIRE_APPROVAL,
              cliBoolean("all", {
                description: `Apply to all pending ${action === "approve" ? "publications" : "approvals"}.`,
              }),
              cliString("by", {
                description: "Approver name.",
                valueName: "name",
              }),
            ]
          : common;
  return defineCliCommand({
    id: `publish ${action}`,
    summary: publishSummary(action),
    requiresProject: true,
    supportsJson: true,
    arguments:
      action === "approve" || action === "revoke" ? [PUBLISH_SLUGS] : [],
    options,
    validate(input) {
      if (action !== "approve" && action !== "revoke") return undefined;
      return (input.arguments.slug as readonly string[]).length === 0 &&
        input.options.all !== true
        ? `publish ${action} requires at least one slug or --all.`
        : undefined;
    },
    async handler(context, input) {
      const { runPublish } = await import("../commands/publish.js");
      return runPublish(await project(context), publishOptions(action, input));
    },
  });
}

function publishOptions(
  action: PublishAction,
  input: CliCommandInput,
): PublishCommandOptions {
  const json = input.options.json === true;
  const at = input.options.at as string | undefined;
  const provider = input.options.provider as PublishCommandOptions["provider"];
  const approvals = input.options.approvals as string | undefined;
  const stateFile = input.options.stateFile as string | undefined;
  const requireApproval = input.options.requireApproval === true;
  return {
    action,
    json,
    ...(at === undefined ? {} : { at }),
    ...(provider === undefined ? {} : { provider }),
    ...(approvals === undefined ? {} : { approvals }),
    ...(stateFile === undefined ? {} : { stateFile }),
    ...(requireApproval ? { workflow: "approved" as const } : {}),
    execute: input.options.execute === true,
    force: input.options.force === true,
    trigger:
      (input.options.trigger as
        | "manual"
        | "scheduled"
        | "ci"
        | "cli"
        | undefined) ?? "cli",
    slugs: (input.arguments.slug as readonly string[] | undefined) ?? [],
    all: input.options.all === true,
    ...(typeof input.options.by === "string"
      ? { approvedBy: input.options.by }
      : {}),
  };
}

function publishSummary(action: PublishAction): string {
  switch (action) {
    case "plan":
      return "Show the publication plan.";
    case "status":
      return "Show publication status.";
    case "validate":
      return "Validate publication readiness.";
    case "run":
      return "Run a publication.";
    case "approve":
      return "Approve publication gates.";
    case "revoke":
      return "Revoke publication approvals.";
    case "record":
      return "Record publication metadata.";
    case "gate":
      return "Show or evaluate a publication gate.";
  }
}

function deployGroupCommand(): CliCommandDefinition {
  return groupCommand("deploy", "Configure deployment for the project.");
}

function deploySetupCommand(): CliCommandDefinition {
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

function deployWorkflowCommand(): CliCommandDefinition {
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

function deployDomainCommand(): CliCommandDefinition {
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

function helpCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "help",
    summary: "Show help for a command.",
    arguments: [
      cliVariadicArgument("command", {
        description: "Command path.",
      }),
    ],
    async handler(context, input) {
      const path = (input.arguments.command as readonly string[]).join(" ");
      if (path === "") {
        context.output.writeLine(
          formatRootHelp(context.registry, helpOptions()),
        );
        return;
      }
      try {
        context.output.writeLine(
          formatPathHelp(context.registry, path, helpOptions()),
        );
      } catch (error) {
        if (!(error instanceof CliUsageError)) throw error;
        const registry = await registryFor(context);
        context.output.writeLine(formatPathHelp(registry, path, helpOptions()));
      }
    },
  });
}

function completionCommand(): CliCommandDefinition {
  return defineCliCommand({
    id: "completion",
    summary: "Generate shell completion.",
    arguments: [
      cliArgument("shell", {
        description: "Shell to generate completion for.",
        required: true,
        values: ["bash", "zsh", "powershell"],
      }),
    ],
    options: [
      cliBoolean("project", {
        description: "Include commands registered by project plugins.",
      }),
    ],
    examples: [
      cliExample("riebeckite completion bash"),
      cliExample("riebeckite completion powershell --project"),
    ],
    async handler(context, input) {
      const registry =
        input.options.project === true
          ? await registryFor(context)
          : context.registry;
      context.output.writeLine(
        generateCompletion(
          registry,
          input.arguments.shell as "bash" | "zsh" | "powershell",
        ),
      );
    },
  });
}

function groupCommand(id: string, summary: string): CliCommandDefinition {
  return defineCliCommand({
    id,
    summary,
    handler(context) {
      context.output.writeLine(
        formatPathHelp(context.registry, id, helpOptions()),
      );
    },
  });
}

async function registryFor(
  context: CliCommandContext,
): Promise<CliCommandRegistry> {
  return context.loadPluginCommands
    ? context.loadPluginCommands()
    : context.registry;
}

async function project(context: CliCommandContext): Promise<RiebeckiteProject> {
  return context.loadProject();
}

function helpOptions() {
  const columns = process.stdout.columns;
  return {
    width: typeof columns === "number" && columns > 0 ? columns : 80,
  };
}

function validateKebabName(
  label: string,
): (value: string) => string | undefined {
  return (value) =>
    /^[a-z][a-z0-9-]{0,62}$/.test(value)
      ? undefined
      : `${label} must be kebab-case and start with a letter.`;
}

function validatePagePath(value: string): string | undefined {
  const valid =
    /^\/[a-z0-9][a-z0-9/_-]*\/$/.test(value) &&
    !value.includes("//") &&
    !value.includes("..");
  return valid
    ? undefined
    : "PageType path must be an absolute, normalized URL path ending with '/'.";
}

function validateIsoTimestamp(value: string): string | undefined {
  return Number.isNaN(Date.parse(value))
    ? "--at requires an ISO-8601 timestamp."
    : undefined;
}

function validateCommaSeparated(
  allowed: readonly string[],
  label: string,
): (value: string) => string | undefined {
  return (value) => {
    const values = value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (values.length === 0)
      return `--features requires at least one ${label}.`;
    const unknown = values.filter((entry) => !allowed.includes(entry));
    return unknown.length === 0
      ? undefined
      : `Unknown ${label}: ${unknown.join(", ")}. Available: ${allowed.join(", ")}.`;
  };
}
