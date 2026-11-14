import { ROOT_USAGE, suggest } from "./cli_parse_usage.js";
import { toArgumentKey, toOptionKey } from "./define.js";
import { CliUsageError } from "./errors.js";
import type {
  CliArgumentDefinition,
  CliArgumentValue,
  CliCommandDefinition,
  CliCommandRegistry,
  CliOptionValue,
} from "./types.js";

export function assignArguments(
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

export function validateArgument(
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

export function validateRequiredOptions(
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
