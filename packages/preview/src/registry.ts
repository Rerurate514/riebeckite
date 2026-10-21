import type { RiebeckitePlugin } from "@riebeckite/core";

export type PreviewFixture = {
  readonly id: string;
  readonly title: string;
  readonly markdown: string;
};

export type PreviewPluginAvailability = "browser" | "node" | "unsupported";

export type PreviewOption =
  | {
      readonly type: "boolean";
      readonly title: string;
      readonly default?: boolean;
    }
  | {
      readonly type: "string";
      readonly title: string;
      readonly default?: string;
    }
  | {
      readonly type: "number";
      readonly title: string;
      readonly default?: number;
    }
  | {
      readonly type: "enum";
      readonly title: string;
      readonly values: readonly string[];
      readonly default?: string;
    };

export type PreviewOptions = Readonly<Record<string, PreviewOption>>;

export type PreviewPlugin<TOptions = unknown> = {
  readonly id: string;
  readonly title: string;
  readonly availability: PreviewPluginAvailability;
  readonly fixtures: readonly PreviewFixture[];
  readonly options?: PreviewOptions;
  create(options: TOptions | undefined): RiebeckitePlugin<TOptions>;
};

export type PreviewRegistry = {
  readonly fixtures: readonly PreviewFixture[];
  readonly plugins: readonly PreviewPlugin[];
  fixture(pluginId: string, id: string): PreviewFixture | undefined;
  plugin(id: string): PreviewPlugin | undefined;
};

export function definePluginPreview<TOptions>(
  preview: PreviewPlugin<TOptions>,
): PreviewPlugin<TOptions> {
  return preview;
}

export function createPreviewRegistry(input: {
  readonly fixtures?: readonly PreviewFixture[];
  readonly plugins?: readonly PreviewPlugin[];
}): PreviewRegistry {
  const fixtures = [...(input.fixtures ?? [])];
  const plugins = [...(input.plugins ?? [])];
  assertFixtures(fixtures, "fixture");
  assertUniqueIds(plugins, "plugin");

  for (const plugin of plugins) {
    assertFixtures(plugin.fixtures, `fixture for plugin "${plugin.id}"`);
    assertOptions(plugin.options, plugin.id);
  }

  return {
    fixtures,
    plugins,
    fixture: (pluginId, id) =>
      plugins
        .find((plugin) => plugin.id === pluginId)
        ?.fixtures.find((fixture) => fixture.id === id) ??
      fixtures.find((fixture) => fixture.id === id),
    plugin: (id) => plugins.find((plugin) => plugin.id === id),
  };
}

export function validatePreviewOptions(
  definitions: PreviewOptions | undefined,
  input: unknown,
):
  | { readonly valid: true; readonly value: Record<string, unknown> }
  | { readonly valid: false } {
  if (input !== undefined && !isPlainRecord(input)) return { valid: false };
  const value = input ?? {};
  const definitionsByKey = definitions ?? {};
  if (Object.keys(value).some((key) => !Object.hasOwn(definitionsByKey, key))) {
    return { valid: false };
  }

  const result: Record<string, unknown> = {};
  for (const [key, definition] of Object.entries(definitionsByKey)) {
    const candidate = value[key];
    if (candidate === undefined) {
      if (definition.default !== undefined) result[key] = definition.default;
      continue;
    }
    if (!matchesOption(definition, candidate)) return { valid: false };
    result[key] = candidate;
  }
  return { valid: true, value: result };
}

function assertUniqueIds(
  values: readonly { readonly id: string }[],
  subject: string,
): void {
  const ids = new Set<string>();
  for (const value of values) {
    if (value.id.trim() === "") throw new Error(`A ${subject} ID is required.`);
    if (ids.has(value.id))
      throw new Error(`Duplicate ${subject} ID: "${value.id}".`);
    ids.add(value.id);
  }
}

function assertFixtures(
  fixtures: readonly PreviewFixture[],
  subject: string,
): void {
  assertUniqueIds(fixtures, subject);
  for (const fixture of fixtures) {
    if (fixture.title.trim() === "")
      throw new Error(`A ${subject} title is required.`);
    if (typeof fixture.markdown !== "string") {
      throw new Error(`A ${subject} markdown value is required.`);
    }
  }
}

function assertOptions(
  options: PreviewOptions | undefined,
  pluginId: string,
): void {
  if (!options) return;
  for (const [key, option] of Object.entries(options)) {
    if (
      key.trim() === "" ||
      isUnsafeObjectKey(key) ||
      option.title.trim() === ""
    ) {
      throw new Error(
        `Preview option names and titles are required for plugin "${pluginId}".`,
      );
    }
    if (option.type === "enum" && option.values.length === 0) {
      throw new Error(`Enum preview option "${key}" needs at least one value.`);
    }
    if (
      option.default !== undefined &&
      !matchesOption(option, option.default)
    ) {
      throw new Error(`Preview option "${key}" has an invalid default value.`);
    }
  }
}

function isUnsafeObjectKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

function matchesOption(option: PreviewOption, value: unknown): boolean {
  if (option.type === "boolean") return typeof value === "boolean";
  if (option.type === "string") return typeof value === "string";
  if (option.type === "number")
    return typeof value === "number" && Number.isFinite(value);
  return typeof value === "string" && option.values.includes(value);
}
