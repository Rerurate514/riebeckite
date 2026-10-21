import {
  type PreviewPlugin,
  type PreviewRegistry,
  validatePreviewOptions,
} from "@riebeckite/preview";

const MAX_MARKDOWN_LENGTH = 100_000;
const MAX_OPTIONS_LENGTH = 10_000;
const MAX_ID_LENGTH = 80;

export type PreviewApiInput = {
  readonly markdown: string;
  readonly pluginId?: string;
  readonly fixtureId?: string;
  readonly options?: Record<string, unknown>;
};

export function parsePreviewApiInput(
  input: unknown,
  registry: PreviewRegistry,
): PreviewApiInput | undefined {
  if (
    !isPlainRecord(input) ||
    !isSafeText(input.markdown, MAX_MARKDOWN_LENGTH)
  ) {
    return undefined;
  }
  if (!isOptionalId(input.pluginId)) return undefined;
  if (!isOptionalId(input.fixtureId)) return undefined;

  const plugin = input.pluginId ? registry.plugin(input.pluginId) : undefined;
  if (input.pluginId && !plugin) return undefined;
  if (
    input.fixtureId &&
    (!plugin || !registry.fixture(plugin.id, input.fixtureId))
  ) {
    return undefined;
  }
  if (!isOptionsWithinLimit(input.options)) return undefined;
  if (!validatePluginOptions(plugin, input.options)) return undefined;

  return {
    markdown: input.markdown,
    pluginId: input.pluginId || undefined,
    fixtureId: input.fixtureId || undefined,
    options: input.options as Record<string, unknown> | undefined,
  };
}

export function isPreviewRequestSizeAllowed(
  contentLength: string | undefined,
): boolean {
  if (!contentLength) return true;
  const length = Number(contentLength);
  return (
    Number.isSafeInteger(length) &&
    length >= 0 &&
    length <= MAX_MARKDOWN_LENGTH + MAX_OPTIONS_LENGTH + 1_000
  );
}

function validatePluginOptions(
  plugin: PreviewPlugin | undefined,
  options: unknown,
): boolean {
  if (!plugin) return options === undefined;
  return validatePreviewOptions(plugin.options, options).valid;
}

function isOptionsWithinLimit(options: unknown): boolean {
  if (options === undefined) return true;
  if (!isPlainRecord(options)) return false;
  try {
    return JSON.stringify(options).length <= MAX_OPTIONS_LENGTH;
  } catch {
    return false;
  }
}

function isOptionalId(value: unknown): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.length <= MAX_ID_LENGTH &&
      value.trim() === value)
  );
}

function isSafeText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === "string" &&
    value.length <= maximumLength &&
    !hasUnpairedSurrogate(value)
  );
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}
