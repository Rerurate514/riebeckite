import type {
  CliCommandContext,
  CliCommandRegistry,
  CliDiagnostic,
  CliLogger,
  CliOutput,
  CliProjectContext,
} from "@riebeckite/core";

type Writers = {
  readonly stdout: (text: string) => void;
  readonly stderr: (text: string) => void;
};

type ContextOptions = {
  readonly cwd: string;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly json: boolean;
  readonly registry: CliCommandRegistry;
  readonly writers?: Writers;
  readonly signal?: AbortSignal;
  readonly projectLoader?: () => Promise<CliProjectContext>;
  readonly pluginLoader?: () => Promise<CliCommandRegistry>;
};

export type CliExecutionContext = CliCommandContext & {
  flushDiagnostics(): void;
  dispose(): Promise<void>;
};

export function createCliCommandContext(
  options: ContextOptions,
): CliExecutionContext {
  const writers = options.writers ?? {
    stdout: (text: string) => process.stdout.write(text),
    stderr: (text: string) => process.stderr.write(text),
  };
  const diagnostics: CliDiagnostic[] = [];
  const cleanups: (() => void | Promise<void>)[] = [];
  let projectPromise: Promise<CliProjectContext> | undefined;

  const output: CliOutput = {
    write(text) {
      writers.stdout(text);
    },
    writeLine(text = "") {
      writers.stdout(`${text}\n`);
    },
    error(text) {
      writers.stderr(`${text}\n`);
    },
    json(value) {
      writers.stdout(`${JSON.stringify(value)}\n`);
    },
  };

  const logger: CliLogger = {
    debug(message) {
      if (!options.json) writers.stdout(`${message}\n`);
    },
    info(message) {
      if (options.json) writers.stderr(`${message}\n`);
      else writers.stdout(`${message}\n`);
    },
    warn(message) {
      writers.stderr(`${message}\n`);
    },
    error(message) {
      writers.stderr(`${message}\n`);
    },
  };

  const context: CliExecutionContext = {
    cwd: options.cwd,
    logger,
    output,
    diagnostics: {
      report(diagnostic) {
        diagnostics.push(diagnostic);
      },
      diagnostics,
    },
    signal: options.signal ?? new AbortController().signal,
    env: options.env,
    json: options.json,
    registry: options.registry,
    ...(options.pluginLoader === undefined
      ? {}
      : { loadPluginCommands: options.pluginLoader }),
    async loadProject() {
      projectPromise ??= (
        options.projectLoader ??
        (() =>
          import("../application_root.js").then((module) =>
            module.resolveRiebeckiteProject(options.cwd),
          ))
      )();
      const project = await projectPromise;
      assignProject(context, project);
      return project;
    },
    onCleanup(cleanup) {
      cleanups.push(cleanup);
    },
    flushDiagnostics() {
      for (const diagnostic of diagnostics) {
        const location = diagnostic.file ? ` (${diagnostic.file})` : "";
        writers.stderr(
          `${diagnostic.severity}: ${diagnostic.message}${location} [${diagnostic.code}]\n`,
        );
      }
      diagnostics.length = 0;
    },
    async dispose() {
      let failure: unknown;
      for (const cleanup of cleanups.splice(0).reverse()) {
        try {
          await cleanup();
        } catch (error) {
          failure ??= error;
        }
      }
      context.flushDiagnostics();
      if (failure !== undefined) throw failure;
    },
  };
  return context;
}

function assignProject(
  context: CliExecutionContext,
  project: CliProjectContext,
): void {
  const mutable = context as {
    project?: CliProjectContext;
    projectRoot?: string;
    config?: CliProjectContext["config"];
  };
  mutable.project = project;
  mutable.projectRoot = project.projectRoot;
  mutable.config = project.config;
}
