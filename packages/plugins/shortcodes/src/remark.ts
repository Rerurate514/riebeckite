import { escapeHtml, escapeHtmlAttribute } from "@riebeckite/core";
import type { Content, Html, Parent, Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  createShortcodeRenderContext,
  renderShortcode,
  resolveShortcodeOptions,
  SHORTCODE_CHILDREN_MARKER,
} from "./render.js";
import type {
  DirectiveNode,
  RemarkShortcodesOptions,
  ResolvedShortcodeOptions,
  ShortcodeAttributes,
} from "./types.js";

export const SHORTCODES_SOURCE = "@riebeckite/plugin-shortcodes";
export const DIAGNOSTIC_UNKNOWN = "shortcodes-unknown";
export const DIAGNOSTIC_INVALID = "shortcodes-invalid";

const ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_][\w-]*$/;

type DiagnosticOptions = {
  place?: unknown;
  ruleId?: string;
  source?: string;
};

type DiagnosticFile = {
  message(reason: string, options: DiagnosticOptions): unknown;
};

type DirectiveTarget = {
  node: DirectiveNode;
  index: number;
  parent: Parent;
};

export function remarkShortcodes(options: RemarkShortcodesOptions = {}) {
  const resolved = resolveShortcodeOptions(options);

  return (tree: Root, file: unknown): void => {
    const targets: DirectiveTarget[] = [];

    visit(
      tree,
      ["containerDirective", "leafDirective"],
      (node, index, parent) => {
        if (parent === undefined || index === undefined) return;
        targets.push({ node: node as DirectiveNode, index, parent });
      },
    );

    for (const target of targets.reverse()) {
      transformDirective(target, resolved, options, file);
    }
  };
}

function transformDirective(
  target: DirectiveTarget,
  resolved: ResolvedShortcodeOptions,
  options: RemarkShortcodesOptions,
  file: unknown,
): void {
  const { node, index, parent } = target;
  const name = node.name;
  const container = node.type === "containerDirective";
  const { label, children } = extractLabel(node);
  const attributes = normalizeAttributes(node, file);
  const childrenHtml = container ? SHORTCODE_CHILDREN_MARKER : undefined;

  const html = renderShortcode(
    {
      name,
      label,
      attributes,
      childrenHtml,
      container,
      context: createShortcodeRenderContext({
        name,
        label,
        raw: label,
        url: firstUrl(attributes),
        contentIndex: options.contentIndex,
        contentSource: options.contentSource,
      }),
    },
    resolved,
  );

  if (!html) {
    report(
      file,
      DIAGNOSTIC_UNKNOWN,
      `Unknown shortcode "::${name}" was left as escaped text.`,
      node,
    );
    parent.children.splice(
      index,
      1,
      ...createFallback(
        resolved.className,
        name,
        label,
        attributes,
        container,
        children,
      ),
    );
    return;
  }

  if (!container) {
    parent.children.splice(index, 1, createHtml(html));
    return;
  }

  const [before, after] = splitOnChildren(html);
  parent.children.splice(
    index,
    1,
    createHtml(before),
    ...(children as Content[]),
    createHtml(after),
  );
}

function splitOnChildren(html: string): [string, string] {
  if (html.includes(SHORTCODE_CHILDREN_MARKER)) {
    const [before, ...rest] = html.split(SHORTCODE_CHILDREN_MARKER);
    return [before, rest.join(SHORTCODE_CHILDREN_MARKER)];
  }

  // A container renderer that ignored `childrenHtml` must not drop the body.
  const closeIndex = html.lastIndexOf("</div>");
  if (closeIndex < 0) return [html, ""];
  return [html.slice(0, closeIndex), html.slice(closeIndex)];
}

function extractLabel(node: DirectiveNode): {
  label: string;
  children: Content[];
} {
  if (node.type === "containerDirective") {
    const [firstChild, ...rest] = node.children;
    if (isDirectiveLabel(firstChild)) {
      return { label: textContent(firstChild), children: rest as Content[] };
    }
    return { label: "", children: node.children as Content[] };
  }

  return { label: textContent(node), children: [] };
}

function isDirectiveLabel(node: unknown): boolean {
  if (node === null || typeof node !== "object") return false;
  const candidate = node as {
    type?: unknown;
    data?: { directiveLabel?: unknown };
  };
  return (
    candidate.type === "paragraph" && candidate.data?.directiveLabel === true
  );
}

function textContent(node: unknown): string {
  if (node === null || typeof node !== "object") return "";

  const value = (node as { value?: unknown }).value;
  if (typeof value === "string") return value;

  const children = (node as { children?: unknown }).children;
  if (!Array.isArray(children)) return "";
  return children.map((child) => textContent(child)).join("");
}

function normalizeAttributes(
  node: DirectiveNode,
  file: unknown,
): ShortcodeAttributes {
  const raw = node.attributes ?? {};
  const attributes: ShortcodeAttributes = {};

  for (const [key, value] of Object.entries(raw)) {
    if (typeof value !== "string" || !ATTRIBUTE_NAME_PATTERN.test(key)) {
      report(
        file,
        DIAGNOSTIC_INVALID,
        `Ignoring malformed attribute "${key}" on shortcode "::${node.name}".`,
        node,
      );
      continue;
    }
    attributes[key] = value;
  }

  return attributes;
}

function createFallback(
  className: string,
  name: string,
  label: string,
  attributes: ShortcodeAttributes,
  container: boolean,
  children: Content[],
): Content[] {
  const classes = `${className} ${className}--unknown`;
  const dataName = ` data-shortcode-name="${escapeHtmlAttribute(name)}"`;
  const directive = escapeHtml(sourceText(name, label, attributes, container));

  if (container) {
    return [
      createHtml(
        `<div class="${escapeHtmlAttribute(classes)}"${dataName}>${directive}`,
      ),
      ...children,
      createHtml("</div>"),
    ];
  }

  return [
    createHtml(
      `<span class="${escapeHtmlAttribute(classes)}"${dataName}>${directive}</span>`,
    ),
  ];
}

function sourceText(
  name: string,
  label: string,
  attributes: ShortcodeAttributes,
  container: boolean,
): string {
  const fence = container ? ":::" : "::";
  const labelPart = label ? `[${label}]` : "";
  return `${fence}${name}${labelPart}${attributesText(attributes)}`;
}

function attributesText(attributes: ShortcodeAttributes): string {
  const entries = Object.entries(attributes);
  if (entries.length === 0) return "";
  const body = entries.map(([key, value]) => `${key}="${value}"`).join(" ");
  return `{${body}}`;
}

function firstUrl(attributes: ShortcodeAttributes): string {
  for (const key of ["url", "src", "href", "path"]) {
    const value = attributes[key];
    if (value !== undefined && value !== "") return value;
  }
  return "";
}

function report(
  file: unknown,
  ruleId: string,
  reason: string,
  node: unknown,
): void {
  const target = file as DiagnosticFile | null | undefined;
  target?.message(reason, {
    place: node,
    ruleId,
    source: SHORTCODES_SOURCE,
  });
}

function createHtml(value: string): Html {
  return { type: "html", value };
}
