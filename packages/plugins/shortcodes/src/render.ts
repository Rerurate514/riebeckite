import type {
  ContentSource,
  PluginCache,
  PluginRenderContext,
} from "@riebeckite/core";
import {
  createUnavailableGeneratedOutputSink,
  escapeHtmlAttribute,
  NoopLogger,
  NoopTracer,
} from "@riebeckite/core";
import { builtinInlineShortcodes, builtinShortcodes } from "./builtins.js";
import type {
  ResolvedShortcodeOptions,
  ShortcodeOptions,
  ShortcodeRenderer,
  ShortcodeRenderInput,
  ShortcodeRenderRequest,
} from "./types.js";

export const DEFAULT_SHORTCODE_CLASS_NAME = "rb-shortcode";

/**
 * Sentinel echoed through {@link ShortcodeRenderInput.childrenHtml}. The remark
 * transform splits the rendered wrapper on this marker and splices the real
 * container body in its place.
 */
export const SHORTCODE_CHILDREN_MARKER = "\u0000rb-shortcodes:children\u0000";

const UNAVAILABLE_CACHE: PluginCache = {
  async get() {
    return undefined;
  },
  async set() {},
  async delete() {},
  async clear() {},
};

export function resolveShortcodeOptions(
  options: ShortcodeOptions = {},
): ResolvedShortcodeOptions {
  const builtins = options.builtins !== false;
  const custom = options.shortcodes ?? {};
  const shortcodes: Record<string, ShortcodeRenderer> = builtins
    ? { ...builtinShortcodes, ...custom }
    : { ...custom };

  const inlineShortcodes = new Set<string>(
    builtins ? builtinInlineShortcodes : [],
  );
  for (const name of options.inlineShortcodes ?? []) {
    inlineShortcodes.add(name);
  }

  const resolved: ResolvedShortcodeOptions = {
    className: options.className ?? DEFAULT_SHORTCODE_CLASS_NAME,
    builtins,
    shortcodes,
    inlineShortcodes,
  };
  if (options.language !== undefined) resolved.language = options.language;
  return resolved;
}

export function isInlineShortcode(
  name: string,
  options: ResolvedShortcodeOptions,
): boolean {
  return options.inlineShortcodes.has(name);
}

export function createShortcodeRenderContext(input: {
  name: string;
  label?: string;
  raw?: string;
  url?: string;
  contentIndex?: Map<string, string>;
  contentSource?: ContentSource;
}): PluginRenderContext {
  return {
    contentIndex: input.contentIndex ?? new Map(),
    diagnostics: [],
    cache: UNAVAILABLE_CACHE,
    output: createUnavailableGeneratedOutputSink(),
    logger: new NoopLogger(),
    tracer: new NoopTracer(),
    contentSource: input.contentSource,
    kind: `shortcode:${input.name}`,
    path: `shortcode:${input.name}`,
    raw: input.raw ?? input.label ?? "",
    label: input.label ?? "",
    url: input.url ?? "",
    embed: false,
  };
}

export function renderShortcode(
  request: ShortcodeRenderRequest,
  options: ResolvedShortcodeOptions,
): string {
  const renderer = options.shortcodes[request.name];
  if (!renderer) return "";

  const attributes = request.attributes ?? {};
  const context =
    request.context ??
    createShortcodeRenderContext({
      name: request.name,
      label: request.label,
      raw: request.label,
      url: firstUrl(attributes),
    });
  const container = request.container ?? false;
  const block = request.block ?? container;

  const input: ShortcodeRenderInput = {
    name: request.name,
    label: request.label ?? "",
    attributes,
    context,
    container,
  };
  if (request.childrenHtml !== undefined) {
    input.childrenHtml = request.childrenHtml;
  }

  const body = renderer(input);
  return wrapShortcode(body, request.name, block, options);
}

function wrapShortcode(
  body: string,
  name: string,
  block: boolean,
  options: ResolvedShortcodeOptions,
): string {
  const tag = block ? "div" : "span";
  const classes = `${options.className} ${options.className}--${name}`;
  const languageAttribute =
    options.language === undefined
      ? ""
      : ` lang="${escapeHtmlAttribute(options.language)}"`;

  return `<${tag} class="${escapeHtmlAttribute(
    classes,
  )}"${languageAttribute}>${body}</${tag}>`;
}

function firstUrl(attributes: Record<string, string>): string {
  for (const key of ["url", "src", "href", "path"]) {
    const value = attributes[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}
