import type { PreviewRegistry } from "./registry.js";
import { validatePreviewOptions } from "./registry.js";

const DEFAULT_MAXIMUM_MARKDOWN_LENGTH = 100_000;
const DEFAULT_MAXIMUM_OPTIONS_LENGTH = 10_000;
const DEFAULT_MAXIMUM_ID_LENGTH = 80;
const DEFAULT_MAXIMUM_OPTION_COUNT = 100;

export type PreviewRequestInput = {
  readonly markdown: string;
  readonly pluginId?: string;
  readonly fixtureId?: string;
  readonly pageId?: string;
  readonly options?: Record<string, unknown>;
};

export type PreviewRequestLimits = {
  readonly maximumMarkdownLength?: number;
  readonly maximumOptionsLength?: number;
  readonly maximumIdLength?: number;
  readonly maximumOptionCount?: number;
};

export type PreviewRequestParseResult =
  | { readonly kind: "ok"; readonly input: PreviewRequestInput }
  | { readonly kind: "invalid" }
  | { readonly kind: "too-large" };

export async function parsePreviewRequest(
  request: Request,
  registry: PreviewRegistry,
  limits: PreviewRequestLimits = {},
): Promise<PreviewRequestParseResult> {
  const resolvedLimits = resolveLimits(limits);
  if (
    !isRequestSizeAllowed(request.headers.get("content-length"), resolvedLimits)
  ) {
    return { kind: "too-large" };
  }

  const body = await readJsonRequest(request, resolvedLimits.maximumBodyLength);
  if (body.kind === "too-large") return body;
  if (body.kind === "invalid") return body;

  const input = parsePreviewInput(body.value, registry, resolvedLimits);
  return input ? { kind: "ok", input } : { kind: "invalid" };
}

export function parsePreviewInput(
  input: unknown,
  registry: PreviewRegistry,
  limits: PreviewRequestLimits = {},
): PreviewRequestInput | undefined {
  const resolvedLimits = resolveLimits(limits);
  if (
    !isPlainRecord(input) ||
    !isSafeText(input.markdown, resolvedLimits.maximumMarkdownLength)
  ) {
    return undefined;
  }
  if (!isOptionalId(input.pluginId, resolvedLimits.maximumIdLength))
    return undefined;
  if (!isOptionalId(input.fixtureId, resolvedLimits.maximumIdLength))
    return undefined;
  if (!isOptionalId(input.pageId, resolvedLimits.maximumIdLength))
    return undefined;

  const plugin = input.pluginId ? registry.plugin(input.pluginId) : undefined;
  if (input.pluginId && !plugin) return undefined;
  if (
    input.fixtureId &&
    (!plugin || !registry.fixture(plugin.id, input.fixtureId))
  ) {
    return undefined;
  }
  if (
    input.pageId &&
    !registry
      .fixture(plugin?.id ?? "", input.fixtureId ?? "")
      ?.pages?.some((page) => page.id === input.pageId)
  ) {
    return undefined;
  }
  if (!isOptionsWithinLimit(input.options, resolvedLimits)) return undefined;
  if (!validatePluginOptions(plugin?.options, input.options)) return undefined;

  return {
    markdown: input.markdown,
    pluginId: input.pluginId || undefined,
    fixtureId: input.fixtureId || undefined,
    ...(input.pageId ? { pageId: input.pageId } : {}),
    options: input.options as Record<string, unknown> | undefined,
  };
}

type ResolvedPreviewRequestLimits = {
  readonly maximumMarkdownLength: number;
  readonly maximumOptionsLength: number;
  readonly maximumIdLength: number;
  readonly maximumOptionCount: number;
  readonly maximumBodyLength: number;
};

function resolveLimits(
  limits: PreviewRequestLimits,
): ResolvedPreviewRequestLimits {
  const maximumMarkdownLength =
    limits.maximumMarkdownLength ?? DEFAULT_MAXIMUM_MARKDOWN_LENGTH;
  const maximumOptionsLength =
    limits.maximumOptionsLength ?? DEFAULT_MAXIMUM_OPTIONS_LENGTH;
  const maximumIdLength = limits.maximumIdLength ?? DEFAULT_MAXIMUM_ID_LENGTH;
  const maximumOptionCount =
    limits.maximumOptionCount ?? DEFAULT_MAXIMUM_OPTION_COUNT;
  return {
    maximumMarkdownLength,
    maximumOptionsLength,
    maximumIdLength,
    maximumOptionCount,
    maximumBodyLength:
      maximumMarkdownLength +
      maximumOptionsLength +
      maximumIdLength * 2 +
      1_000,
  };
}

function isRequestSizeAllowed(
  contentLength: string | null,
  limits: ResolvedPreviewRequestLimits,
): boolean {
  if (!contentLength) return true;
  const length = Number(contentLength);
  return (
    Number.isSafeInteger(length) &&
    length >= 0 &&
    length <= limits.maximumBodyLength
  );
}

async function readJsonRequest(
  request: Request,
  maximumLength: number,
): Promise<
  | { readonly kind: "ok"; readonly value: unknown }
  | { readonly kind: "invalid" }
  | { readonly kind: "too-large" }
> {
  const body = request.body;
  if (!body) return { kind: "invalid" };
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > maximumLength) {
        await reader.cancel();
        return { kind: "too-large" };
      }
      chunks.push(chunk.value);
    }
  } catch {
    return { kind: "invalid" };
  } finally {
    reader.releaseLock();
  }
  try {
    return {
      kind: "ok",
      value: JSON.parse(new TextDecoder().decode(concat(chunks, length))),
    };
  } catch {
    return { kind: "invalid" };
  }
}

function concat(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const output = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}

function validatePluginOptions(
  options: Parameters<typeof validatePreviewOptions>[0],
  input: unknown,
): boolean {
  return validatePreviewOptions(options, input).valid;
}

function isOptionsWithinLimit(
  options: unknown,
  limits: ResolvedPreviewRequestLimits,
): boolean {
  if (options === undefined) return true;
  if (!isPlainRecord(options)) return false;
  const entries = Object.entries(options);
  if (entries.length > limits.maximumOptionCount) return false;
  if (
    entries.some(
      ([key, value]) => isUnsafeObjectKey(key) || !isSafeOptionValue(value),
    )
  ) {
    return false;
  }
  try {
    return JSON.stringify(options).length <= limits.maximumOptionsLength;
  } catch {
    return false;
  }
}

function isSafeOptionValue(value: unknown): boolean {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value))
  );
}

function isUnsafeObjectKey(key: string): boolean {
  return key === "__proto__" || key === "constructor" || key === "prototype";
}

function isOptionalId(
  value: unknown,
  maximumLength: number,
): value is string | undefined {
  return (
    value === undefined ||
    (typeof value === "string" &&
      value.length <= maximumLength &&
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
