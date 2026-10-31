import type { ResolvedRiebeckiteConfig } from "../types/resolved_riebeckite_config.js";

export type CliOptionType = "boolean" | "string" | "number" | "enum";

export type CliOptionDefinition = {
  readonly name: string;
  readonly description?: string;
  readonly type: CliOptionType;
  readonly short?: string;
  readonly values?: readonly string[];
  readonly default?: string | number | boolean | readonly string[];
  readonly required?: boolean;
  readonly repeatable?: boolean;
  readonly negatable?: boolean;
  readonly integer?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly valueName?: string;
  readonly hidden?: boolean;
  readonly validate?: (value: string) => string | undefined;
};

export type CliArgumentDefinition = {
  readonly name: string;
  readonly description?: string;
  readonly required?: boolean;
  readonly variadic?: boolean;
  readonly values?: readonly string[];
  readonly default?: string;
  readonly hidden?: boolean;
  readonly validate?: (value: string) => string | undefined;
};

export type CliExample = {
  readonly command: string;
  readonly description?: string;
};

export type CliProjectContext = {
  readonly invocationCwd: string;
  readonly projectRoot: string;
  readonly configRoot: string;
  readonly configPath: string;
  readonly appRoot: string;
  readonly contentRoot: string;
  readonly config: ResolvedRiebeckiteConfig;
};

export type CliDiagnosticSeverity = "error" | "warning" | "info";

export type CliDiagnostic = {
  readonly code: string;
  readonly severity: CliDiagnosticSeverity;
  readonly message: string;
  readonly file?: string;
  readonly plugin?: string;
};

export type CliDiagnosticSink = {
  report(diagnostic: CliDiagnostic): void;
  readonly diagnostics: readonly CliDiagnostic[];
};

export type CliLogger = {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
};

export type CliOutput = {
  write(text: string): void;
  writeLine(text?: string): void;
  error(text: string): void;
  json(value: unknown): void;
};

export type CliCommandContext = {
  readonly cwd: string;
  readonly projectRoot?: string;
  readonly project?: CliProjectContext;
  readonly config?: ResolvedRiebeckiteConfig;
  readonly logger: CliLogger;
  readonly output: CliOutput;
  readonly diagnostics: CliDiagnosticSink;
  readonly signal: AbortSignal;
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly json: boolean;
  readonly registry: CliCommandRegistry;
  loadProject(): Promise<CliProjectContext>;
  loadPluginCommands?(): Promise<CliCommandRegistry>;
  onCleanup(cleanup: () => void | Promise<void>): void;
};

export type CliCommandResult =
  | void
  | boolean
  | { readonly exitCode?: number; readonly json?: unknown };

export type CliOptionValue = string | number | boolean | readonly string[];
export type CliArgumentValue = string | readonly string[];

export type CliCommandInput = {
  readonly command: CliCommandDefinition;
  readonly arguments: Readonly<Record<string, CliArgumentValue | undefined>>;
  readonly options: Readonly<Record<string, CliOptionValue | undefined>>;
  readonly rawArguments: readonly string[];
};

export type CliCommandHandler = (
  context: CliCommandContext,
  input: CliCommandInput,
) => Promise<CliCommandResult> | CliCommandResult;

export type CliCommandSpec = {
  readonly id: string;
  readonly summary: string;
  readonly description?: string;
  readonly arguments?: readonly CliArgumentDefinition[];
  readonly options?: readonly CliOptionDefinition[];
  readonly examples?: readonly CliExample[];
  readonly requiresProject?: boolean;
  readonly raw?: boolean;
  readonly aliases?: readonly string[];
  readonly hidden?: boolean;
  readonly supportsJson?: boolean;
  readonly validate?: (input: CliCommandInput) => string | undefined;
  readonly handler: CliCommandHandler;
};

export type CliCommandDefinition = CliCommandSpec;

export type CliCommandSource = "builtin" | "plugin";

export type CliCommandRegistration = {
  readonly command: CliCommandDefinition;
  readonly source: CliCommandSource;
  readonly pluginId?: string;
  readonly namespace?: string;
};

export type CliCommandNode = {
  readonly name: string;
  readonly path: string;
  readonly command?: CliCommandRegistration;
  readonly children: readonly CliCommandNode[];
};

export type CliCommandRegistry = {
  readonly registrations: readonly CliCommandRegistration[];
  readonly nodes: readonly CliCommandNode[];
  readonly aliases: ReadonlyMap<string, string>;
  readonly namespaces: ReadonlyMap<string, string>;
};

export type CliCommandResolution =
  | {
      readonly kind: "command";
      readonly registration: CliCommandRegistration;
      readonly input: CliCommandInput;
    }
  | {
      readonly kind: "help";
      readonly command?: CliCommandDefinition;
      readonly path?: string;
    }
  | { readonly kind: "version" }
  | { readonly kind: "root-help" };

export type PluginCliExtension = {
  readonly namespace?: string;
  readonly commands: readonly CliCommandDefinition[];
};

export type CliJsonEnvelope<T> = {
  readonly ok: true;
  readonly command: string;
  readonly data: T;
};

export type CliJsonErrorEnvelope = {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly command?: string;
    readonly exitCode: number;
    readonly details?: unknown;
    readonly suggestions?: readonly string[];
  };
};
