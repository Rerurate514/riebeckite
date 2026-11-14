import type { CliNumberOptions, EmptyOptions } from "./define_part1.js";
import type {
  CliArgumentDefinition,
  CliArgumentValue,
  CliCommandInput,
  CliExample,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

export function cliNumber<const O extends CliNumberOptions = EmptyOptions>(
  name: string,
  options: O = {} as O,
): CliOptionDefinition & { readonly type: "number" } & O {
  return {
    name,
    type: "number",
    ...options,
  };
}

export type CliEnumOptions = {
  readonly description?: string;
  readonly short?: string;
  readonly required?: boolean;
  readonly default?: string;
  readonly valueName?: string;
  readonly hidden?: boolean;
};

export function cliEnum<
  const V extends string,
  const O extends CliEnumOptions = EmptyOptions,
>(
  name: string,
  values: readonly V[],
  options: O = {} as O,
): CliOptionDefinition & {
  readonly type: "enum";
  readonly values: readonly V[];
} & O {
  return {
    name,
    type: "enum",
    values,
    ...options,
  };
}

export type CliArgumentOptions = {
  readonly description?: string;
  readonly required?: boolean;
  readonly values?: readonly string[];
  readonly default?: string;
  readonly hidden?: boolean;
  readonly validate?: (value: string) => string | undefined;
};

export function cliArgument<const O extends CliArgumentOptions = EmptyOptions>(
  name: string,
  options: O = {} as O,
): CliArgumentDefinition & O {
  return {
    name,
    ...options,
  };
}

export function cliVariadicArgument<
  const O extends CliArgumentOptions = EmptyOptions,
>(
  name: string,
  options: O = {} as O,
): CliArgumentDefinition & O & { readonly variadic: true } {
  return {
    name,
    ...options,
    variadic: true,
  };
}

export function cliExample(command: string, description?: string): CliExample {
  return description === undefined ? { command } : { command, description };
}

export function toOptionKey(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, letter: string) =>
    letter.toUpperCase(),
  );
}

export function toArgumentKey(name: string): string {
  return toOptionKey(name);
}

export function optionValueKey(value: CliOptionValue): string {
  return Array.isArray(value) ? value.join(",") : String(value);
}

export function argumentValueKey(value: CliArgumentValue): string {
  return typeof value === "string" ? value : value.join(",");
}

export function readOption(
  input: CliCommandInput,
  name: string,
): CliOptionValue | undefined {
  return input.options[toOptionKey(name)];
}

export function readArgument(
  input: CliCommandInput,
  name: string,
): CliArgumentValue | undefined {
  return input.arguments[toArgumentKey(name)];
}
