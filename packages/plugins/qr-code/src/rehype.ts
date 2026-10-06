import { qrElementClassName } from "./options.js";
import type {
  ElementNode,
  HastNode,
  ParentNode,
  RawNode,
  ResolvedQrCodeOptions,
  TextNode,
} from "./types.js";

const CAPTION_PATTERN =
  /^[ \t]*#[ \t]*caption[ \t]*:[ \t]*(.+?)[ \t]*(?:\r?\n|$)/i;
const META_TITLE_PATTERN = /title=(?:"([^"]*)"|'([^']*)'|(\S+))/;
const PLUGIN_SOURCE = "@riebeckite/plugin-qr-code";

export function rehypeQrCode(options: ResolvedQrCodeOptions) {
  return async (tree: HastNode, file: unknown) => {
    const replacements: Promise<void>[] = [];
    visitElements(tree, (node, parent, index) => {
      if (!parent || index === undefined) return;
      if (!isQrCodeBlock(node, options.language)) return;
      replacements.push(replaceQrBlock(parent, index, node, file, options));
    });
    await Promise.all(replacements);
  };
}

async function replaceQrBlock(
  parent: ParentNode,
  index: number,
  pre: ElementNode,
  file: unknown,
  options: ResolvedQrCodeOptions,
) {
  const code = findDirectChild(pre, "code");
  const rawSource = code
    ? getTextContent(code).trim()
    : getTextContent(pre).trim();
  if (rawSource === "") {
    reportDiagnostic(
      file,
      "Empty qr block: add the text or URL to encode.",
      "empty-block",
    );
    return;
  }

  const extracted = extractCaption(rawSource, pre, code);
  const caption = options.caption ? extracted.caption : null;
  const source = extracted.body === "" ? rawSource : extracted.body;

  const { buildQrSvg } = await import("./render.js");
  const result = await buildQrSvg(source, options);

  parent.children = parent.children ?? [];
  if (result.ok === false) {
    parent.children[index] = buildErrorFigure(
      source,
      caption,
      options,
      result.message,
      file,
    );
  } else {
    parent.children[index] = buildRenderedFigure(
      source,
      result.svg,
      caption,
      options,
    );
  }
}

function buildRenderedFigure(
  source: string,
  svg: string,
  caption: string | null,
  options: ResolvedQrCodeOptions,
): ElementNode {
  return buildFigure(source, caption, options, "rendered", [raw(svg)]);
}

function buildErrorFigure(
  source: string,
  caption: string | null,
  options: ResolvedQrCodeOptions,
  message: string,
  file: unknown,
): ElementNode {
  reportDiagnostic(file, `QR code could not be rendered: ${message}`, "render");
  return buildFigure(source, caption, options, "error", []);
}

function buildFigure(
  source: string,
  caption: string | null,
  options: ResolvedQrCodeOptions,
  state: "rendered" | "error",
  canvasChildren: HastNode[],
): ElementNode {
  const labelId = `${figureId(source, options)}-caption`;
  return element(
    "figure",
    {
      className: options.className,
      dataQr: state,
      dataQrLevel: options.level,
      dataQrMargin: String(options.margin),
      style: `--rb-qr-size:${options.width}px`,
    },
    [
      element(
        "div",
        {
          className: qrElementClassName(options.className, "canvas"),
          role: "img",
          ariaLabelledby: caption ? labelId : undefined,
          ariaLabel: caption ? undefined : "QR code",
        },
        canvasChildren,
      ),
      renderCaption(source, caption, options, labelId),
    ],
  );
}

function renderCaption(
  source: string,
  caption: string | null,
  options: ResolvedQrCodeOptions,
  labelId: string,
): ElementNode {
  const children: HastNode[] = [];
  if (caption) {
    children.push(
      element(
        "span",
        {
          id: labelId,
          className: qrElementClassName(options.className, "caption-text"),
        },
        [text(caption)],
      ),
    );
  }
  children.push(renderSource(source, options));
  return element(
    "figcaption",
    { className: qrElementClassName(options.className, "caption") },
    children,
  );
}

function renderSource(
  source: string,
  options: ResolvedQrCodeOptions,
): HastNode {
  const className = qrElementClassName(options.className, "source");
  const href = navigableHref(source);
  if (href) return element("a", { className, href }, [text(source)]);
  return element("span", { className }, [text(source)]);
}

const NAVIGABLE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function navigableHref(source: string): string | null {
  try {
    const { protocol } = new URL(source);
    return NAVIGABLE_PROTOCOLS.has(protocol) ? source : null;
  } catch {
    return null;
  }
}

function extractCaption(
  source: string,
  pre: ElementNode,
  code: ElementNode | null,
): { caption: string | null; body: string } {
  const title =
    getStringProperty(pre, "title") ??
    getStringProperty(code ?? pre, "title") ??
    metaTitle(getStringProperty(code ?? pre, "data-meta")) ??
    metaTitle(getStringProperty(code ?? pre, "dataMeta")) ??
    metaTitle(getCodeDataMeta(code));

  const match = source.match(CAPTION_PATTERN);
  const caption = title ?? (match ? match[1].trim() : null);
  const body = match ? source.slice(match[0].length).trim() : source;
  return {
    caption: caption && caption.trim() !== "" ? caption.trim() : null,
    body,
  };
}

function metaTitle(meta: string | null): string | null {
  if (!meta) return null;
  const match = meta.match(META_TITLE_PATTERN);
  const value = match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
  return value && value.trim() !== "" ? value.trim() : null;
}

function getCodeDataMeta(code: ElementNode | null): string | null {
  const meta = code?.data?.meta;
  return typeof meta === "string" ? meta : null;
}

function figureId(source: string, options: ResolvedQrCodeOptions): string {
  let hash = 0;
  const seed = `${options.level}:${options.margin}:${source}`;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return `rb-qr-${Math.abs(hash).toString(36)}`;
}

function isQrCodeBlock(node: ElementNode, language: string): boolean {
  if (node.tagName !== "pre") return false;
  const code = findDirectChild(node, "code");
  if (!code) return false;
  return hasClass(code, `language-${language}`);
}

function findDirectChild(
  node: ElementNode,
  tagName: string,
): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" && child.tagName === tagName,
    ) ?? null
  );
}

export function element(
  tagName: string,
  properties: Record<string, unknown> = {},
  children: HastNode[] = [],
): ElementNode {
  return { type: "element", tagName, properties, children };
}

export function text(value: string): TextNode {
  return { type: "text", value };
}

export function raw(value: string): RawNode {
  return { type: "raw", value };
}

export function getTextContent(node: HastNode): string {
  const value = (node as { value?: unknown }).value;
  if (node.type === "text" && typeof value === "string") return value;
  return getChildren(node).map(getTextContent).join("");
}

function getStringProperty(node: ElementNode, key: string): string | null {
  const value = node.properties?.[key];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

function hasClass(node: ElementNode, className: string): boolean {
  const value = node.properties?.className;
  const classes = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(/\s+/)
      : [];
  return classes.includes(className);
}

export function visitElements(
  node: HastNode,
  visitor: (node: ElementNode, parent?: ParentNode, index?: number) => void,
  parent?: ParentNode,
  index?: number,
) {
  if (node.type === "element") visitor(node, parent, index);

  const children = getChildren(node);
  for (const [childIndex, child] of children.entries()) {
    visitElements(
      child,
      visitor,
      children.length > 0 ? (node as ParentNode) : parent,
      childIndex,
    );
  }
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}

function reportDiagnostic(file: unknown, message: string, ruleId: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, { source: PLUGIN_SOURCE, ruleId });
  }
}
