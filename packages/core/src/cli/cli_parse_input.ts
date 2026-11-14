import { assignArguments, validateRequiredOptions } from "./cli_parse_args.js";
import { parseLongOption, parseShortOption } from "./cli_parse_options.js";
import { ROOT_USAGE } from "./cli_parse_usage.js";
import { toOptionKey } from "./define.js";
import { CliUsageError } from "./errors.js";
import type {
  CliCommandDefinition,
  CliCommandInput,
  CliCommandRegistration,
  CliCommandRegistry,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

export type ParseResult =
  | { readonly kind: "help" }
  | { readonly kind: "parsed"; readonly input: CliCommandInput };

export function parseCommandInput(
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

export function initializeOptions(
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

export function hasJsonOption(command: CliCommandDefinition): boolean {
  return (command.options ?? []).some((option) => option.name === "json");
}
