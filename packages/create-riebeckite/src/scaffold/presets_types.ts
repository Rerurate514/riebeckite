import type {
  ScaffoldLanguage,
  ScaffoldPresetName,
} from "./presets_languages.js";

export type ScaffoldThemeSpec = {
  /** Npm package, for example `@riebeckite/theme-minimal`. */
  readonly package: string;
  /** Factory/import name, for example `minimalTheme`. */
  readonly factory: string;
  /** Optional literal source for the factory call arguments, e.g. `{ colorMode: "light" }`. */
  readonly options?: string;
};

/** How a plugin factory is referenced in the generated config file. */
export type ScaffoldPluginSpec = {
  /** Npm package, for example `@riebeckite/plugin-seo`. */
  readonly package: string;
  /** Factory/import name, for example `seo`. */
  readonly factory: string;
  /** Options source for the factory call; see {@link ScaffoldOptions}. */
  readonly options?: ScaffoldOptions;
};

/**
 * Context passed to option sources. `variables` are the user-supplied site
 * values (`title`, `baseUrl`, ...), `languages` the preset's configured
 * languages, and configuration detail depth. `showcase` uses depth 3 so its
 * generated config is a complete options reference; the other presets keep
 * their configuration intentionally small.
 */
export type ScaffoldOptionContext = {
  readonly variables: {
    readonly name: string;
    readonly title: string;
    readonly description: string;
    readonly baseUrl: string;
    readonly locale: string;
  };
  readonly languages: readonly ScaffoldLanguage[];
  readonly depth: number;
};

/** A single option value: a literal, or a function of the scaffold context. */
export type ScaffoldOptionValue =
  | string
  | ((context: ScaffoldOptionContext) => string);

/** A config field gated to a minimum preset depth. */
export type ScaffoldOptionField = {
  /** The lowest `ScaffoldOptionContext.depth` that includes this field. */
  readonly depth: number;
  readonly value: ScaffoldOptionValue;
};

/**
 * Options for a generated plugin call: a literal source string, a function
 * producing one, or a field map whose fields appear from a minimum depth.
 * The field map form lets each preset tier demonstrate the configuration
 * surface step by step while keeping one source of truth per plugin.
 */
export type ScaffoldOptions =
  | string
  | ((context: ScaffoldOptionContext) => string)
  | Readonly<Record<string, ScaffoldOptionField>>;

/** Content pages the scaffold can emit. */
export type ScaffoldPageKey =
  | "index"
  | "framework/plugins"
  | "framework/themes"
  | "guide"
  | "examples"
  | "reference/plugins"
  | "reference/themes";

/** README verbosity. */
export type ScaffoldReadmeLevel = "short" | "standard" | "rich";

export type ScaffoldPreset = {
  readonly name: ScaffoldPresetName;
  /** One-line human description, shown by `--list-presets`. */
  readonly description: string;
  /** Languages the l10n plugin is configured with. A single entry means no l10n. */
  readonly languages: readonly ScaffoldLanguage[];
  readonly theme: ScaffoldThemeSpec | null;
  readonly plugins: readonly ScaffoldPluginSpec[];
  readonly contentPages: readonly ScaffoldPageKey[];
  readonly readme: ScaffoldReadmeLevel;
};
