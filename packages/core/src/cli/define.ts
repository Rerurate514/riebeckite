import type {
  CliArgumentDefinition,
  CliArgumentValue,
  CliCommandContext,
  CliCommandDefinition,
  CliCommandInput,
  CliCommandResult,
  CliCommandSpec,
  CliExample,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

type CamelCase<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<CamelCase<Tail>>}`
  : S;

type OptionBase<O extends CliOptionDefinition> = O extends {
  readonly type: "boolean";
}
  ? boolean
  : O extends { readonly repeatable: true }
    ? readonly string[]
    : O extends { readonly type: "number" }
      ? number
      : O extends { readonly type: "enum" }
        ? O extends { readonly values: readonly (infer V extends string)[] }
          ? V
          : string
        : string;

type OptionValue<O extends CliOptionDefinition> = O extends {
  readonly default: infer D;
}
  ? D
  : O extends { readonly type: "boolean" }
    ? boolean
    : O extends { readonly repeatable: true }
      ? readonly string[]
      : O extends { readonly required: true }
        ? OptionBase<O>
        : OptionBase<O> | undefined;

export type CliOptionsOf<
  Os extends readonly CliOptionDefinition[] | undefined,
> = {
  readonly [O in NonNullable<Os>[number] as CamelCase<O["name"]>]: OptionValue<O>;
};

type ArgumentValue<A extends CliArgumentDefinition> = A extends {
  readonly variadic: true;
}
  ? readonly string[]
  : string;

type ArgumentField<A extends CliArgumentDefinition> = A extends {
  readonly default: infer D;
}
  ? D
  : A extends { readonly required: true }
    ? ArgumentValue<A>
    : A extends { readonly variadic: true }
      ? readonly string[]
      : ArgumentValue<A> | undefined;

export type CliArgumentsOf<
  As extends readonly CliArgumentDefinition[] | undefined,
> = {
  readonly [A in NonNullable<As>[number] as CamelCase<A["name"]>]: ArgumentField<A>;
};

type CommandShape = Omit<CliCommandSpec, "handler">;

export type CliTypedCommandInput<C extends CommandShape> = {
  readonly command: CliCommandDefinition;
  readonly arguments: CliArgumentsOf<C["arguments"]>;
  readonly options: CliOptionsOf<C["options"]>;
  readonly rawArguments: readonly string[];
};

export type CliTypedCommand<C extends CommandShape> = C & {
  readonly handler: (
    context: CliCommandContext,
    input: CliTypedCommandInput<C>,
  ) => Promise<CliCommandResult> | CliCommandResult;
};

export function defineCliCommand<const C extends CommandShape>(
  command: CliTypedCommand<C>,
): CliCommandDefinition {
  return command as unknown as CliCommandDefinition;
}

export type CliBooleanOptions = {
  readonly description?: string;
  readonly short?: string;
  readonly required?: boolean;
  readonly negatable?: boolean;
  readonly hidden?: boolean;
};

export function cliBoolean(
  name: string,
  options: CliBooleanOptions = {},
): CliOptionDefinition {
  return {
    name,
    type: "boolean",
    ...options,
  };
}

export type CliStringOptions = {
  readonly description?: string;
  readonly short?: string;
  readonly required?: boolean;
  readonly repeatable?: boolean;
  readonly valueName?: string;
  readonly hidden?: boolean;
  readonly validate?: (value: string) => string | undefined;
};

export function cliString(
  name: string,
  options: CliStringOptions = {},
): CliOptionDefinition {
  return {
    name,
    type: "string",
    ...options,
  };
}

export function cliStringWithDefault(
  name: string,
  defaultValue: string,
  options: CliStringOptions = {},
): CliOptionDefinition & { readonly default: string } {
  return {
    name,
    type: "string",
    ...options,
    default: defaultValue,
  };
}

export type CliNumberOptions = {
  readonly description?: string;
  readonly short?: string;
  readonly required?: boolean;
  readonly integer?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly default?: number;
  readonly valueName?: string;
  readonly hidden?: boolean;
  readonly validate?: (value: string) => string | undefined;
};

export function cliNumber(
  name: string,
  options: CliNumberOptions = {},
): CliOptionDefinition {
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

export function cliEnum<const V extends string>(
  name: string,
  values: readonly V[],
  options: CliEnumOptions = {},
): CliOptionDefinition & { readonly values: readonly V[] } {
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

export function cliArgument(
  name: string,
  options: CliArgumentOptions = {},
): CliArgumentDefinition {
  return {
    name,
    ...options,
  };
}

export function cliVariadicArgument(
  name: string,
  options: CliArgumentOptions = {},
): CliArgumentDefinition & { readonly variadic: true } {
  return {
    name,
    ...options,
    variadic: true,
  };
}

export function cliExample(
  command: string,
  description?: string,
): CliExample {
  return description === undefined
    ? { command }
    : { command, description };
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
