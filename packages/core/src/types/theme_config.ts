export type ThemeColorMode = "light" | "dark" | "system";

export type ThemeStyle = {
  moduleSpecifier: string;
};

type ThemeSettingBase<TType extends string, TValue> = {
  type: TType;
  label: string;
  description?: string;
  default: TValue;
  group?: string;
  section?: string;
  light?: TValue;
  dark?: TValue;
};

export type ThemeColorSetting = ThemeSettingBase<"color", string>;
export type ThemeBooleanSetting = ThemeSettingBase<"boolean", boolean>;
export type ThemeNumberSetting = ThemeSettingBase<
  "number" | "slider",
  number
> & {
  min?: number;
  max?: number;
  step?: number;
};
export type ThemeSelectSetting<T extends string = string> = ThemeSettingBase<
  "select",
  T
> & {
  options: readonly { value: T; label: string }[];
};
export type ThemeTextSetting = ThemeSettingBase<"text", string>;

export type ThemeSetting =
  | ThemeColorSetting
  | ThemeBooleanSetting
  | ThemeNumberSetting
  | ThemeSelectSetting
  | ThemeTextSetting;

export type ThemeSettingsSchema = Record<string, ThemeSetting>;

export type ThemeSettings<S extends ThemeSettingsSchema> = {
  [K in keyof S]: S[K] extends ThemeColorSetting | ThemeTextSetting
    ? string
    : S[K] extends ThemeBooleanSetting
      ? boolean
      : S[K] extends ThemeNumberSetting
        ? number
        : S[K] extends ThemeSelectSetting<infer T>
          ? T
          : never;
};

export type ThemePreset<S extends ThemeSettingsSchema> = {
  label: string;
  description?: string;
  settings: Partial<ThemeSettings<S>>;
};

export type ThemeOptions<S extends ThemeSettingsSchema> = {
  colorMode?: ThemeColorMode;
  layout?: "article" | "sidebar" | "full-width";
  preset?: string;
  settings?: Partial<ThemeSettings<S>>;
  stylesheets?: string[];
};

export type ResolvedThemeSettings = {
  values: Record<string, string | number | boolean>;
  attributes: Record<`data-rb-setting-${string}`, string>;
  style: string;
};

export type ThemeInstance<S extends ThemeSettingsSchema = ThemeSettingsSchema> =
  {
    definition: ThemeDefinition<S>;
    options: ThemeOptions<S>;
  };

export type ThemeDefinition<
  S extends ThemeSettingsSchema = ThemeSettingsSchema,
> = ((options?: ThemeOptions<S>) => ThemeInstance<S>) & {
  name: string;
  styles: readonly ThemeStyle[];
  settings: S;
  presets: Record<string, ThemePreset<S>>;
};

export type ThemeInput<S extends ThemeSettingsSchema = ThemeSettingsSchema> =
  ThemeInstance<S>;

export type ResolvedTheme = {
  name: string;
  colorMode: ThemeColorMode;
  layout: "article" | "sidebar" | "full-width";
  styles: ThemeStyle[];
  stylesheets: string[];
  settings: ResolvedThemeSettings;
};

export class ThemeSettingsValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Invalid theme settings: ${issues.join(" ")}`);
    this.name = "ThemeSettingsValidationError";
  }
}

export function defineTheme<const S extends ThemeSettingsSchema>(definition: {
  name: string;
  styles: readonly ThemeStyle[];
  settings?: S;
  presets?: Record<string, ThemePreset<S>>;
}): ThemeDefinition<S> {
  for (const key of Object.keys(definition.settings ?? {})) {
    if (!/^[a-z][a-zA-Z0-9]*$/.test(key))
      throw new ThemeSettingsValidationError([
        `settings.${key}: Invalid setting key.`,
      ]);
  }
  const theme = ((options: ThemeOptions<S> = {}) => ({
    definition: theme,
    options,
  })) as ThemeDefinition<S>;
  Object.defineProperty(theme, "name", { value: definition.name });
  theme.styles = definition.styles;
  theme.settings = (definition.settings ?? {}) as S;
  theme.presets = definition.presets ?? {};
  return theme;
}

export function defineThemeSettings<const S extends ThemeSettingsSchema>(
  settings: S,
): S {
  return settings;
}

export function resolveTheme<S extends ThemeSettingsSchema>(
  input: ThemeInput<S> | undefined,
  fallback: ThemeDefinition<S>,
): ResolvedTheme {
  const instance = input ?? fallback();
  const { definition, options } = instance;
  const preset =
    options.preset === undefined
      ? undefined
      : definition.presets[options.preset];
  if (options.preset !== undefined && !preset) {
    throw new ThemeSettingsValidationError([
      `preset: Unknown preset "${options.preset}".`,
    ]);
  }
  const configuredSettings = { ...preset?.settings, ...options.settings };
  const values = validateThemeSettings(definition.settings, configuredSettings);
  return {
    name: definition.name,
    colorMode: options.colorMode ?? "system",
    layout: options.layout ?? "article",
    styles: [...definition.styles],
    stylesheets: options.stylesheets ?? [],
    settings: reflectThemeSettings(
      definition.settings,
      values,
      new Set(Object.keys(configuredSettings)),
    ),
  };
}

export function validateThemeSettings<S extends ThemeSettingsSchema>(
  schema: S,
  input: unknown,
): ThemeSettings<S> {
  if (input === undefined) input = {};
  if (!isRecord(input))
    throw new ThemeSettingsValidationError(["settings: Expected an object."]);
  const issues: string[] = [];
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(schema, key))
      issues.push(`settings.${key}: Unknown setting.`);
  }
  const values: Record<string, string | number | boolean> = {};
  for (const [key, setting] of Object.entries(schema)) {
    const value = Object.hasOwn(input, key) ? input[key] : setting.default;
    if (!isSettingValue(setting, value)) {
      issues.push(`settings.${key}: Invalid ${setting.type} value.`);
    } else {
      values[key] = value;
    }
  }
  if (issues.length > 0) throw new ThemeSettingsValidationError(issues);
  return values as ThemeSettings<S>;
}

export function reflectThemeSettings(
  schema: ThemeSettingsSchema,
  values: Record<string, string | number | boolean>,
  configured = new Set<string>(),
): ResolvedThemeSettings {
  const attributes: Record<`data-rb-setting-${string}`, string> = {};
  const declarations: string[] = [];
  const darkDeclarations: string[] = [];
  for (const [key, setting] of Object.entries(schema)) {
    const value = values[key];
    const attribute = `data-rb-setting-${toKebabCase(key)}` as const;
    attributes[attribute] = String(value);
    if (
      setting.type === "color" ||
      setting.type === "number" ||
      setting.type === "slider"
    ) {
      const variable = `--rb-setting-${toKebabCase(key)}`;
      declarations.push(
        `${variable}: ${configured.has(key) ? value : (setting.light ?? value)};`,
      );
      if (setting.dark !== undefined) {
        darkDeclarations.push(
          `${variable}: ${configured.has(key) ? value : setting.dark};`,
        );
      }
    }
  }
  const roots = ":is(:root, .rb-theme-root)";
  const systemRoots = ":is(:root, .rb-theme-root):not([data-rb-mode])";
  const style =
    declarations.length === 0
      ? ""
      : `${roots} { ${declarations.join(" ")} }${darkDeclarations.length === 0 ? "" : ` ${roots}[data-rb-mode="dark"] { ${darkDeclarations.join(" ")} } @media (prefers-color-scheme: dark) { ${systemRoots} { ${darkDeclarations.join(" ")} } }`}`;
  return { values, attributes, style };
}

function isSettingValue(
  setting: ThemeSetting,
  value: unknown,
): value is string | number | boolean {
  if (setting.type === "boolean") return typeof value === "boolean";
  if (setting.type === "number" || setting.type === "slider") {
    return (
      typeof value === "number" &&
      Number.isFinite(value) &&
      (setting.min === undefined || value >= setting.min) &&
      (setting.max === undefined || value <= setting.max) &&
      (setting.step === undefined ||
        isStepAligned(value, setting.min, setting.step))
    );
  }
  if (setting.type === "select")
    return (
      typeof value === "string" &&
      setting.options.some((option) => option.value === value)
    );
  if (setting.type === "color")
    return (
      typeof value === "string" &&
      /^(?:#[0-9a-f]{3,8}|(?:rgb|hsl)a?\([0-9.%\s,/-]+\))$/i.test(value)
    );
  return typeof value === "string" && !/[\u0000-\u001f<>]/.test(value);
}

function isStepAligned(value: number, min: number | undefined, step: number) {
  const steps = (value - (min ?? 0)) / step;
  return Math.abs(steps - Math.round(steps)) < 1e-9;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function toKebabCase(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}
