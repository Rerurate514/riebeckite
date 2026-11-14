import { getStringProperty, visitElements } from "./hast.js";
import type { ElementNode, HastNode } from "./types.js";

export function restoreCodeMeta(tree: HastNode) {
  visitElements(tree, (node) => {
    if (node.tagName !== "pre") return;
    const code = findDirectChild(node, "code");
    if (!code) return;
    const meta = getCodeMeta(code);
    if (!meta) return;
    // rehype-pretty-code reads fence metadata from the `<code>` node. The
    // Markdown-to-HAST bridge can keep it in several places, so normalize it
    // here before handing the tree to the highlighter.
    code.data = { ...getRecord(code.data), meta };
  });
}

export const LANGUAGE_CLASS_PREFIX = "language-";

export const SOURCE_FILE_TITLE_PREFIX = "source-file:";

export /**
 * Shiki language ids are lowercase, but rehype-pretty-code reads the id
 * verbatim from the `language-*` class on `<code>`. A capitalized fence like
 * ```Kotlin``` therefore fails to load and silently renders unhighlighted, so
 * normalize the id before highlighting runs.
 */
function normalizeCodeLanguages(tree: HastNode) {
  visitElements(tree, (node) => {
    if (node.tagName !== "code") return;
    const className = normalizeLanguageClassNames(node.properties?.className);
    if (className === undefined) return;
    node.properties = { ...node.properties, className };
  });
}

export function normalizeLanguageClassNames(className: unknown): unknown {
  if (Array.isArray(className)) {
    return className.map(normalizeLanguageClassName);
  }
  if (typeof className === "string") {
    return className.split(/\s+/).map(normalizeLanguageClassName).join(" ");
  }
  return className;
}

export function normalizeLanguageClassName(value: unknown): unknown {
  if (typeof value !== "string" || !value.startsWith(LANGUAGE_CLASS_PREFIX)) {
    return value;
  }
  const language = value.slice(LANGUAGE_CLASS_PREFIX.length);
  return `${LANGUAGE_CLASS_PREFIX}${language.toLowerCase()}`;
}

export function getCodeMeta(node: ElementNode): string | null {
  const dataMeta = getDataMeta(node);
  return (
    dataMeta ??
    getStringProperty(node, "meta") ??
    getStringProperty(node, "dataMeta") ??
    getStringProperty(node, "data-meta") ??
    getStringProperty(node, "metastring")
  );
}

export function getDataMeta(node: ElementNode): string | null {
  const data = node.data;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const meta = (data as { meta?: unknown }).meta;
  return typeof meta === "string" ? meta : null;
}

export function getRecord(data: unknown): Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export function getLanguage(
  pre: ElementNode,
  code: ElementNode | null,
): string {
  const language =
    getStringProperty(pre, "dataLanguage") ??
    getStringProperty(code ?? pre, "dataLanguage");
  return language ?? "text";
}

export function isTerminalLanguage(language: string): boolean {
  return ["bash", "console", "sh", "shell", "terminal", "zsh"].includes(
    language,
  );
}

export function isDiffLanguage(language: string): boolean {
  return ["diff"].includes(language.toLowerCase());
}

export function findDirectChild(
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
