import type {
  CliArgumentDefinition,
  CliArgumentValue,
  CliCommandContext,
  CliCommandDefinition,
  CliCommandResult,
  CliCommandSpec,
  CliOptionDefinition,
  CliOptionValue,
} from "./types.js";

export type CamelCase<S extends string> =
  S extends `${infer Head}-${infer Tail}`
    ? `${Head}${Capitalize<CamelCase<Tail>>}`
    : S;

export type OptionBase<O extends CliOptionDefinition> = O extends {
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

export type OptionValue<O extends CliOptionDefinition> = O extends {
  readonly default: unknown;
}
  ? OptionSettledValue<O>
  : O extends { readonly type: "boolean" }
    ? boolean
    : O extends { readonly repeatable: true }
      ? readonly string[]
      : O extends { readonly required: true }
        ? OptionBase<O>
        : OptionBase<O> | undefined;

export type OptionSettledValue<O extends CliOptionDefinition> = O extends {
  readonly type: "boolean";
}
  ? boolean
  : O extends { readonly repeatable: true }
    ? readonly string[]
    : OptionBase<O>;

export type UnionToIntersection<U> = (
  U extends unknown
    ? (value: U) => void
    : never
) extends (value: infer I) => void
  ? I
  : never;

export type EmptyOptions = Record<never, never>;

export type OptionEntry<O extends CliOptionDefinition> = {
  readonly [K in CamelCase<O["name"]>]: OptionValue<O>;
};

export type CliOptionsOf<
  Os extends readonly CliOptionDefinition[] | undefined,
> = [NonNullable<Os>[number]] extends [never]
  ? EmptyOptions
  : UnionToIntersection<
      NonNullable<Os>[number] extends infer O
        ? O extends CliOptionDefinition
          ? OptionEntry<O>
          : never
        : never
    >;

export type ArgumentValue<A extends CliArgumentDefinition> = A extends {
  readonly variadic: true;
}
  ? readonly string[]
  : string;

export type ArgumentField<A extends CliArgumentDefinition> = A extends {
  readonly default: unknown;
}
  ? ArgumentValue<A>
  : A extends { readonly required: true }
    ? ArgumentValue<A>
    : A extends { readonly variadic: true }
      ? readonly string[]
      : ArgumentValue<A> | undefined;

export type ArgumentEntry<A extends CliArgumentDefinition> = {
  readonly [K in CamelCase<A["name"]>]: ArgumentField<A>;
};

export type CliArgumentsOf<
  As extends readonly CliArgumentDefinition[] | undefined,
> = [NonNullable<As>[number]] extends [never]
  ? EmptyOptions
  : UnionToIntersection<
      NonNullable<As>[number] extends infer A
        ? A extends CliArgumentDefinition
          ? ArgumentEntry<A>
          : never
        : never
    >;

export type CommandMetadata = Omit<
  CliCommandSpec,
  "handler" | "arguments" | "options"
>;

export type CliTypedCommandInput<
  A extends readonly CliArgumentDefinition[] | undefined,
  O extends readonly CliOptionDefinition[] | undefined,
> = {
  readonly command: CliCommandDefinition;
  readonly arguments: CliArgumentsOf<A> &
    Readonly<Record<string, CliArgumentValue | undefined>>;
  readonly options: CliOptionsOf<O> &
    Readonly<Record<string, CliOptionValue | undefined>>;
  readonly rawArguments: readonly string[];
};

export type CliTypedCommand<
  A extends readonly CliArgumentDefinition[] | undefined,
  O extends readonly CliOptionDefinition[] | undefined,
> = CommandMetadata & {
  readonly arguments?: A;
  readonly options?: O;
  readonly handler: (
    context: CliCommandContext,
    input: CliTypedCommandInput<A, O>,
  ) => Promise<CliCommandResult> | CliCommandResult;
};

export function defineCliCommand<
  const A extends readonly CliArgumentDefinition[] = readonly [],
  const O extends readonly CliOptionDefinition[] = readonly [],
>(command: CliTypedCommand<A, O>): CliCommandDefinition {
  return command;
}

export type CliBooleanOptions = {
  readonly description?: string;
  readonly short?: string;
  readonly required?: boolean;
  readonly negatable?: boolean;
  readonly hidden?: boolean;
};

export function cliBoolean<const O extends CliBooleanOptions = EmptyOptions>(
  name: string,
  options: O = {} as O,
): CliOptionDefinition & { readonly type: "boolean" } & O {
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

export function cliString<const O extends CliStringOptions = EmptyOptions>(
  name: string,
  options: O = {} as O,
): CliOptionDefinition & { readonly type: "string" } & O {
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
