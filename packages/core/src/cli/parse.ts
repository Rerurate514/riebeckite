import { toArgumentKey, toOptionKey } from "./define.js";
import { CliUsageError } from "./errors.js";
import { commandPathSegments, normalizeCommandId } from "./registry.js";
import type {
  CliArgumentDefinition,
  CliArgumentValue,
  CliCommandDefinition,
  CliCommandInput,
  CliCommandRegistration,
  CliCommandRegistry,
  CliCommandResolution,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

export const ROOT_USAGE = "Usage: riebeckite <command> [options]";

export function resolveCliCommand(
  registry: CliCommandRegistry,
  argv: readonly string[],
): CliCommandResolution {
  if (argv.length === 0) return { kind: "root-help" };
  if (argv[0] === "--help" || argv[0] === "-h") return { kind: "root-help" };
  if (argv[0] === "--version" || argv[0] === "-v") return { kind: "version" };

  const match = matchCommand(registry, argv);
  if (!match) {
    const first = argv[0] ?? "";
    if (first.startsWith("-")) {
      throw new CliUsageError(`Unknown option: ${first}.`, {
        suggestions: suggest(
          first.replace(/^-+/, ""),
          registry.registrations.flatMap((registration) =>
            (registration.command.options ?? []).map((option) => option.name),
          ),
        ).map((name) => `--${name}`),
        usage: ROOT_USAGE,
      });
    }
    const known = commandPaths(registry);
    const typed = commandTokens(argv);
    const target = typed.length > 0 ? typed : [first];
    throw new CliUsageError(`Unknown command: ${target.join(" ")}.`, {
      commandPath: target.join(" "),
      suggestions: suggest(target.join(" "), known),
      usage: ROOT_USAGE,
    });
  }

  const remaining = argv.slice(match.length);
  const parsed = parseCommandInput(match.registration, remaining, registry);
  if (parsed.kind === "help") {
    return {
      kind: "help",
      command: match.registration.command,
      path: match.registration.command.id,
    };
  }
  return {
    kind: "command",
    registration: match.registration,
    input: parsed.input,
  };
}

export function suggest(
  value: string,
  candidates: readonly string[],
): string[] {
  return candidates
    .map((candidate) => ({
      candidate,
      distance: editDistance(value.toLowerCase(), candidate.toLowerCase()),
      prefix:
        candidate.toLowerCase().startsWith(value.toLowerCase()) ||
        value.toLowerCase().startsWith(candidate.toLowerCase()),
    }))
    .filter(
      (entry) =>
        entry.prefix ||
        entry.distance <= Math.max(2, Math.ceil(value.length / 3)),
    )
    .sort((left, right) => {
      if (left.prefix !== right.prefix) return left.prefix ? -1 : 1;
      return left.distance - right.distance;
    })
    .slice(0, 5)
    .map((entry) => entry.candidate);
}

function commandPaths(registry: CliCommandRegistry): string[] {
  const paths = new Set<string>();
  for (const registration of registry.registrations) {
    paths.add(registration.command.id);
  }
  for (const alias of registry.aliases.keys()) paths.add(alias);
  return [...paths].sort();
}

function matchCommand(
  registry: CliCommandRegistry,
  argv: readonly string[],
):
  | {
      readonly registration: CliCommandRegistration;
      readonly length: number;
    }
  | undefined {
  const candidates: {
    segments: readonly string[];
    registration: CliCommandRegistration;
  }[] = registry.registrations.map((registration) => ({
    segments: commandPathSegments(registration.command.id),
    registration,
  }));
  for (const [alias, target] of registry.aliases) {
    const registration = registry.registrations.find(
      (entry) => entry.command.id === target,
    );
    if (registration) {
      candidates.push({
        segments: commandPathSegments(alias),
        registration,
      });
    }
  }

  let best:
    | { readonly registration: CliCommandRegistration; readonly length: number }
    | undefined;
  for (const candidate of candidates) {
    if (candidate.segments.length > argv.length) continue;
    let matches = true;
    for (let index = 0; index < candidate.segments.length; index += 1) {
      if (
        normalizeCommandId(argv[index] ?? "") !== candidate.segments[index] ||
        (argv[index] ?? "").startsWith("-")
      ) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;
    if (!best || candidate.segments.length > best.length) {
      best = {
        registration: candidate.registration,
        length: candidate.segments.length,
      };
    }
  }
  return best;
}

function commandTokens(argv: readonly string[]): string[] {
  const tokens: string[] = [];
  for (const token of argv) {
    if (token.startsWith("-")) break;
    tokens.push(token);
  }
  return tokens;
}

type ParseResult =
  | { readonly kind: "help" }
  | { readonly kind: "parsed"; readonly input: CliCommandInput };

function parseCommandInput(
  registration: CliCommandRegistration,
  tokens: readonly string[],
  registry: CliCommandRegistry,
): ParseResult {
  const command = registration.command;
  if (command.raw) {
    if (tokens[0] === "--help" || tokens[0] === "-h") return { kind: "help" };
    return {
      kind: "parsed",
      input: {
        command,
        arguments: {},
        options: {},
        rawArguments: [...tokens],
      },
    };
  }

  const options = initializeOptions(command.options ?? []);
  const seen = new Set<string>();
  const positionals: string[] = [];
  let optionsEnded = false;

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index] ?? "";
    if (optionsEnded) {
      positionals.push(token);
      continue;
    }
    if (token === "--") {
      optionsEnded = true;
      continue;
    }
    if (token === "--help" || token === "-h") return { kind: "help" };
    if (
      token === "--json" &&
      command.supportsJson === true &&
      !hasJsonOption(command)
    ) {
      options.json = true;
      continue;
    }
    if (token.startsWith("--")) {
      const consumed = parseLongOption(command, tokens, index, options, seen);
      index += consumed;
      continue;
    }
    if (token.startsWith("-") && token !== "-") {
      const consumed = parseShortOption(command, tokens, index, options, seen);
      if (consumed === "help") return { kind: "help" };
      index += consumed;
      continue;
    }
    positionals.push(token);
  }

  const argumentValues = assignArguments(command, positionals, registry);
  const input: CliCommandInput = {
    command,
    arguments: argumentValues,
    options,
    rawArguments: [...tokens],
  };
  validateRequiredOptions(command, options);
  if (command.validate) {
    const message = command.validate(input);
    if (message) {
      throw new CliUsageError(message, {
        commandPath: command.id,
        usage: ROOT_USAGE,
      });
    }
  }
  return { kind: "parsed", input };
}

function initializeOptions(
  definitions: readonly CliOptionDefinition[],
): Record<string, CliOptionValue | undefined> {
  const values: Record<string, CliOptionValue | undefined> = {};
  for (const definition of definitions) {
    if (definition.default !== undefined) {
      values[toOptionKey(definition.name)] = definition.default;
    } else if (definition.type === "boolean") {
      values[toOptionKey(definition.name)] = false;
    } else if (definition.repeatable) {
      values[toOptionKey(definition.name)] = [];
    } else {
      values[toOptionKey(definition.name)] = undefined;
    }
  }
  return values;
}

function hasJsonOption(command: CliCommandDefinition): boolean {
  return (command.options ?? []).some((option) => option.name === "json");
}

function parseLongOption(
  command: CliCommandDefinition,
  tokens: readonly string[],
  index: number,
  values: Record<string, CliOptionValue | undefined>,
  seen: Set<string>,
): number {
  const token = tokens[index] ?? "";
  const body = token.slice(2);
  const equals = body.indexOf("=");
  const name = equals === -1 ? body : body.slice(0, equals);
  const inlineValue = equals === -1 ? undefined : body.slice(equals + 1);
  const definitions = command.options ?? [];

  let definition = definitions.find((entry) => entry.name === name);
  let booleanValue = true;
  if (!definition && name.startsWith("no-")) {
    const positive = definitions.find(
      (entry) => entry.name === name.slice(3) && entry.negatable,
    );
    if (positive) {
      definition = positive;
      booleanValue = false;
    }
  }
  if (!definition) {
    const names = definitions
      .filter((entry) => !entry.hidden)
      .map((entry) => entry.name);
    const suggestion = suggest(name, names)[0];
    throw new CliUsageError(
      `Unknown option: --${name}.${suggestion ? ` Did you mean --${suggestion}?` : ""}`,
      { commandPath: command.id, usage: ROOT_USAGE },
    );
  }

  if (definition.type === "boolean") {
    if (inlineValue !== undefined) {
      booleanValue = parseBooleanValue(definition, inlineValue);
    }
    setOptionValue(definition, booleanValue, values, seen);
    return 0;
  }
  if (!booleanValue) {
    throw new CliUsageError(
      `--no-${definition.name} is not a boolean option.`,
      {
        commandPath: command.id,
        usage: ROOT_USAGE,
      },
    );
  }

  let value = inlineValue;
  let consumed = 0;
  if (value === undefined) {
    value = tokens[index + 1];
    consumed = 1;
    if (
      value === undefined ||
      (value.startsWith("-") &&
        !(definition.type === "number" && /^-\d/.test(value)))
    ) {
      throw new CliUsageError(`--${definition.name} requires a value.`, {
        commandPath: command.id,
        usage: ROOT_USAGE,
      });
    }
  }
  setOptionValue(
    definition,
    convertOptionValue(definition, value),
    values,
    seen,
  );
  return consumed;
}

function parseShortOption(
  command: CliCommandDefinition,
  tokens: readonly string[],
  index: number,
  values: Record<string, CliOptionValue | undefined>,
  seen: Set<string>,
): number | "help" {
  const token = tokens[index] ?? "";
  const body = token.slice(1);
  const definitions = command.options ?? [];
  for (let offset = 0; offset < body.length; offset += 1) {
    const short = body[offset] ?? "";
    if (short === "h") return "help";
    const definition = definitions.find((entry) => entry.short === short);
    if (!definition) {
      throw new CliUsageError(`Unknown option: -${short}.`, {
        commandPath: command.id,
        usage: ROOT_USAGE,
      });
    }
    if (definition.type === "boolean") {
      setOptionValue(definition, true, values, seen);
      continue;
    }
    let value = body.slice(offset + 1);
    if (value.startsWith("=")) value = value.slice(1);
    let consumed = 0;
    if (value.length === 0) {
      value = tokens[index + 1] ?? "";
      consumed = 1;
      if (
        !value ||
        (value.startsWith("-") &&
          !(definition.type === "number" && /^-\d/u.test(value)))
      ) {
        throw new CliUsageError(`-${short} requires a value.`, {
          commandPath: command.id,
          usage: ROOT_USAGE,
        });
      }
    }
    setOptionValue(
      definition,
      convertOptionValue(definition, value),
      values,
      seen,
    );
    return consumed;
  }
  return 0;
}

function parseBooleanValue(
  definition: CliOptionDefinition,
  value: string,
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new CliUsageError(`--${definition.name} accepts only true or false.`, {
    usage: ROOT_USAGE,
  });
}

function convertOptionValue(
  definition: CliOptionDefinition,
  value: string,
): string | number {
  if (definition.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new CliUsageError(`--${definition.name} requires a number.`, {
        usage: ROOT_USAGE,
      });
    }
    if (definition.integer && !Number.isInteger(parsed)) {
      throw new CliUsageError(`--${definition.name} requires an integer.`, {
        usage: ROOT_USAGE,
      });
    }
    if (definition.min !== undefined && definition.max !== undefined) {
      if (parsed < definition.min || parsed > definition.max) {
        throw new CliUsageError(
          `--${definition.name} requires an integer between ${definition.min} and ${definition.max}.`,
          { usage: ROOT_USAGE },
        );
      }
    } else if (definition.min !== undefined && parsed < definition.min) {
      throw new CliUsageError(
        `--${definition.name} must be at least ${definition.min}.`,
        { usage: ROOT_USAGE },
      );
    } else if (definition.max !== undefined && parsed > definition.max) {
      throw new CliUsageError(
        `--${definition.name} must be at most ${definition.max}.`,
        { usage: ROOT_USAGE },
      );
    }
    return parsed;
  }

  if (definition.type === "enum") {
    const values = definition.values ?? [];
    if (!values.includes(value)) {
      throw new CliUsageError(
        `--${definition.name} requires one of: ${values.join(", ")}.`,
        { usage: ROOT_USAGE },
      );
    }
  }
  const message = definition.validate?.(value);
  if (message) {
    throw new CliUsageError(`--${definition.name}: ${message}`, {
      usage: ROOT_USAGE,
    });
  }
  return value;
}

function setOptionValue(
  definition: CliOptionDefinition,
  value: string | number | boolean,
  values: Record<string, CliOptionValue | undefined>,
  seen: Set<string>,
): void {
  const key = toOptionKey(definition.name);
  if (definition.repeatable) {
    const existing = values[key];
    const list = Array.isArray(existing) ? [...existing] : [];
    list.push(String(value));
    values[key] = list;
    seen.add(key);
    return;
  }
  if (seen.has(key) && definition.type !== "boolean") {
    throw new CliUsageError(`Duplicate option: --${definition.name}.`, {
      usage: ROOT_USAGE,
    });
  }
  seen.add(key);
  values[key] = value;
}

function assignArguments(
  command: CliCommandDefinition,
  positionals: readonly string[],
  registry: CliCommandRegistry,
): Record<string, CliArgumentValue | undefined> {
  const definitions = command.arguments ?? [];
  const values: Record<string, CliArgumentValue | undefined> = {};
  let index = 0;
  for (
    let definitionIndex = 0;
    definitionIndex < definitions.length;
    definitionIndex += 1
  ) {
    const definition = definitions[definitionIndex];
    if (!definition) continue;
    if (definition.variadic) {
      const rest = positionals.slice(index);
      if (definition.required && rest.length === 0) {
        throw new CliUsageError(
          `Missing required argument: ${definition.name}.`,
          { commandPath: command.id, usage: ROOT_USAGE },
        );
      }
      values[toArgumentKey(definition.name)] = rest.map((value) =>
        validateArgument(definition, value),
      );
      index = positionals.length;
      continue;
    }
    const value = positionals[index];
    if (value === undefined) {
      if (definition.default !== undefined) {
        values[toArgumentKey(definition.name)] = definition.default;
      } else if (definition.required) {
        throw new CliUsageError(
          `Missing required argument: ${definition.name}.`,
          { commandPath: command.id, usage: ROOT_USAGE },
        );
      } else {
        values[toArgumentKey(definition.name)] = undefined;
      }
      continue;
    }
    values[toArgumentKey(definition.name)] = validateArgument(
      definition,
      value,
    );
    index += 1;
  }

  if (index < positionals.length) {
    const extra = positionals[index] ?? "";
    const children = suggest(
      `${command.id} ${extra}`,
      registry.registrations
        .map((registration) => registration.command.id)
        .filter((id) => id.startsWith(`${command.id} `)),
    );
    throw new CliUsageError(
      `Unexpected argument: ${extra}.${children.length > 0 ? ` Did you mean ${children[0]}?` : ""}`,
      { commandPath: command.id, usage: ROOT_USAGE },
    );
  }
  return values;
}

function validateArgument(
  definition: CliArgumentDefinition,
  value: string,
): string {
  if (definition.values && !definition.values.includes(value)) {
    throw new CliUsageError(
      `Argument ${definition.name} requires one of: ${definition.values.join(", ")}.`,
      { usage: ROOT_USAGE },
    );
  }
  const message = definition.validate?.(value);
  if (message) {
    throw new CliUsageError(`Argument ${definition.name}: ${message}`, {
      usage: ROOT_USAGE,
    });
  }
  return value;
}

function validateRequiredOptions(
  command: CliCommandDefinition,
  values: Record<string, CliOptionValue | undefined>,
): void {
  for (const definition of command.options ?? []) {
    if (!definition.required) continue;
    const value = values[toOptionKey(definition.name)];
    if (value === undefined || value === false) {
      throw new CliUsageError(
        `Missing required option: --${definition.name}.`,
        { commandPath: command.id, usage: ROOT_USAGE },
      );
    }
  }
}

function editDistance(left: string, right: string): number {
  if (left === right) return 0;
  const previous = Array.from(
    { length: right.length + 1 },
    (_, index) => index,
  );
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0] ?? 0;
    previous[0] = leftIndex;
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex] ?? 0;
      const cost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      previous[rightIndex] = Math.min(
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + 1,
        diagonal + cost,
      );
      diagonal = above;
    }
  }
  return previous[right.length] ?? left.length;
}
