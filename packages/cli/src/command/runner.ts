import {
  type CliCommandInput,
  type CliCommandRegistry,
  type CliCommandResolution,
  type CliJsonErrorEnvelope,
  type CliProjectContext,
  CliUsageError,
  formatPathHelp,
  formatRootHelp,
  resolveCliCommand,
} from "@riebeckite/core";
import { renderCliError } from "../error_renderer.js";
import { createBuiltinRegistry } from "./builtins.js";
import { createCliCommandContext } from "./context.js";
import {
  describePluginCommandFailure,
  discoverPluginCommands,
  type PluginCommandFailure,
} from "./plugin_commands.js";

export type RunCliOptions = {
  readonly argv: readonly string[];
  readonly cwd?: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
  readonly stdout?: (text: string) => void;
  readonly stderr?: (text: string) => void;
  readonly version: string;
  readonly registry?: CliCommandRegistry;
};

export async function runCli(options: RunCliOptions): Promise<number> {
  const argv = options.argv;
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const stdout =
    options.stdout ?? ((text: string) => process.stdout.write(text));
  const stderr =
    options.stderr ?? ((text: string) => process.stderr.write(text));
  const json = argv.includes("--json");
  let projectPromise: Promise<CliProjectContext> | undefined;
  const loadProject = () =>
    (projectPromise ??= import("../application_root.js").then((module) =>
      module.resolveRiebeckiteProject(cwd),
    ));

  let registry = options.registry ?? createBuiltinRegistry();
  let pluginRegistry: Promise<CliCommandRegistry> | undefined;
  const loadPluginCommands = () => {
    pluginRegistry ??= (async () => {
      const discovered = discoverPluginCommands(registry, await loadProject());
      for (const failure of discovered.failures) {
        stderr(`${describePluginCommandFailure(failure)}\n`);
      }
      registry = discovered.registry;
      (context as { registry: CliCommandRegistry }).registry = registry;
      return registry;
    })();
    return pluginRegistry;
  };
  let resolution: CliCommandResolution;
  try {
    resolution = resolveCliCommand(registry, argv);
  } catch (error) {
    if (!(error instanceof CliUsageError) || !isUnknownCommand(error)) {
      return reportFailure(error, { stderr, json });
    }
    const discovered = await tryDiscover(loadProject, registry);
    registry = discovered.registry;
    for (const failure of discovered.failures) {
      stderr(`${describePluginCommandFailure(failure)}\n`);
    }
    if (registry.registrations.length === discovered.baseLength) {
      return reportFailure(error, { stderr, json });
    }
    try {
      resolution = resolveCliCommand(registry, argv);
    } catch (nextError) {
      return reportFailure(nextError, { stderr, json });
    }
  }

  if (resolution.kind === "version") {
    stdout(`riebeckite ${options.version}\n`);
    return 0;
  }
  if (resolution.kind === "root-help") {
    stdout(`${formatRootHelp(registry, { width: terminalWidth() })}\n`);
    return 0;
  }
  if (resolution.kind === "help") {
    const help =
      resolution.path === undefined
        ? formatRootHelp(registry, { width: terminalWidth() })
        : formatPathHelp(registry, resolution.path, { width: terminalWidth() });
    stdout(`${help}\n`);
    return 0;
  }

  const controller = new AbortController();
  const onSigint = () => {
    controller.abort();
  };
  process.once("SIGINT", onSigint);
  const context = createCliCommandContext({
    cwd,
    env,
    json,
    registry,
    signal: controller.signal,
    projectLoader: loadProject,
    pluginLoader: loadPluginCommands,
    ...(options.stdout === undefined ? {} : { writers: { stdout, stderr } }),
  });

  let exitCode = 0;
  try {
    if (resolution.registration.command.requiresProject) {
      await context.loadProject();
    }
    const result = await resolution.registration.command.handler(
      context,
      resolution.input,
    );
    exitCode = resultExitCode(result);
    if (
      typeof result === "object" &&
      result !== null &&
      "json" in result &&
      result.json !== undefined &&
      context.json
    ) {
      context.output.json(result.json);
    }
  } catch (error) {
    exitCode = reportFailure(error, {
      stderr,
      json,
      command: commandPath(resolution),
    });
  } finally {
    process.removeListener("SIGINT", onSigint);
    try {
      await context.dispose();
    } catch (error) {
      if (exitCode === 0) {
        exitCode = reportFailure(error, {
          stderr,
          json,
          command: commandPath(resolution),
        });
      }
    }
  }
  if (controller.signal.aborted && exitCode === 0) return 130;
  return exitCode;
}

async function tryDiscover(
  loadProject: () => Promise<CliProjectContext>,
  registry: CliCommandRegistry,
) {
  const baseLength = registry.registrations.length;
  try {
    const project = await loadProject();
    const discovered = discoverPluginCommands(registry, project);
    return { ...discovered, baseLength };
  } catch {
    return {
      registry,
      failures: [] as readonly PluginCommandFailure[],
      baseLength,
    };
  }
}

function reportFailure(
  error: unknown,
  options: {
    readonly stderr: (text: string) => void;
    readonly json: boolean;
    readonly command?: string;
  },
): number {
  const exitCode = readExitCode(error);
  if (options.json) {
    const envelope: CliJsonErrorEnvelope = {
      ok: false,
      error: {
        code: readCode(error),
        message: error instanceof Error ? error.message : String(error),
        ...(options.command === undefined ? {} : { command: options.command }),
        exitCode,
        ...(error instanceof CliUsageError && error.suggestions !== undefined
          ? { suggestions: error.suggestions }
          : {}),
      },
    };
    options.stderr(`${JSON.stringify(envelope)}\n`);
    return exitCode;
  }
  options.stderr(`${formatFailure(error)}\n`);
  return exitCode;
}

function formatFailure(error: unknown): string {
  if (!(error instanceof CliUsageError)) return renderCliError(error);
  const lines = [error.message];
  if (error.suggestions && error.suggestions.length > 0) {
    lines.push(
      "",
      "Did you mean:",
      ...error.suggestions.map((name) => `  ${name}`),
    );
  }
  if (error.usage) lines.push("", error.usage);
  return lines.join("\n");
}

function isUnknownCommand(error: CliUsageError): boolean {
  return error.message.startsWith("Unknown command:");
}

function readExitCode(error: unknown): number {
  if (error instanceof Error) {
    const value = (error as unknown as { exitCode?: unknown }).exitCode;
    if (typeof value === "number" && Number.isInteger(value) && value > 0) {
      return value;
    }
  }
  return 1;
}

function readCode(error: unknown): string {
  if (error instanceof Error) {
    const value = (error as unknown as { code?: unknown }).code;
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "CLI_INTERNAL_ERROR";
}

function resultExitCode(result: unknown): number {
  if (result === false) return 1;
  if (typeof result === "object" && result !== null && "exitCode" in result) {
    const exitCode = (result as { exitCode?: unknown }).exitCode;
    if (typeof exitCode === "number" && Number.isInteger(exitCode))
      return exitCode;
  }
  return 0;
}

function commandPath(
  resolution: Extract<CliCommandResolution, { kind: "command" }>,
): string {
  return resolution.registration.command.id;
}

function terminalWidth(): number {
  const columns = process.stdout.columns;
  return typeof columns === "number" && columns > 0 ? columns : 80;
}

export type { CliCommandInput };
