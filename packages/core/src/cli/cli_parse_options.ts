import { ROOT_USAGE, suggest } from "./cli_parse_usage.js";
import { toOptionKey } from "./define.js";
import { CliUsageError } from "./errors.js";
import type {
  CliCommandDefinition,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

export function parseLongOption(
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

export function parseShortOption(
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

export function parseBooleanValue(
  definition: CliOptionDefinition,
  value: string,
): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  throw new CliUsageError(`--${definition.name} accepts only true or false.`, {
    usage: ROOT_USAGE,
  });
}

export function convertOptionValue(
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

export function setOptionValue(
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
