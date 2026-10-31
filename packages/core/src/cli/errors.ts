export class CliUsageError extends Error {
  readonly code = "CLI_USAGE";
  readonly exitCode = 2;
  readonly commandPath?: string;
  readonly suggestions?: readonly string[];
  readonly usage?: string;

  constructor(
    message: string,
    options: {
      commandPath?: string;
      suggestions?: readonly string[];
      usage?: string;
    } = {},
  ) {
    super(message);
    this.name = "CliUsageError";
    if (options.commandPath !== undefined) {
      this.commandPath = options.commandPath;
    }
    if (options.suggestions !== undefined) {
      this.suggestions = options.suggestions;
    }
    if (options.usage !== undefined) {
      this.usage = options.usage;
    }
  }
}

export class CliCommandError extends Error {
  readonly code: string;
  readonly exitCode: number;
  readonly details?: unknown;

  constructor(
    message: string,
    options: {
      code?: string;
      exitCode?: number;
      details?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "CliCommandError";
    this.code = options.code ?? "CLI_COMMAND_FAILED";
    this.exitCode = options.exitCode ?? 1;
    if (options.details !== undefined) this.details = options.details;
  }
}

export class CliAbortError extends CliCommandError {
  constructor(message = "Command aborted.") {
    super(message, { code: "CLI_ABORTED", exitCode: 130 });
    this.name = "CliAbortError";
  }
}
