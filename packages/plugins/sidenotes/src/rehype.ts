import { resolveSidenotesOptions } from "./options.js";
import {
  renderHastChildren,
  renderSidenotesNote,
  renderSidenotesReference,
  SIDENOTES_FOOTNOTES_CLASS,
  sidenotesKey,
} from "./render.js";
import type {
  HastElementNode,
  HastNode,
  HastRawNode,
  ResolvedSidenotesOptions,
  SidenotesOptions,
} from "./types.js";

/**
 * mdast-util-to-hast materializes GFM footnotes before plugin rehype plugins
 * run (the core pipeline has no `rehype-footnotes`): inline references become
 * `<sup><a data-footnote-ref href="#user-content-fn-…">` and definitions
 * become a trailing `<section data-footnotes>`. This transformer rewrites
 * those produced nodes into sidenote markup while keeping the footnote
 * targets reachable.
 */
const FOOTNOTE_REFERENCE_ATTRIBUTE = "dataFootnoteRef";
const FOOTNOTES_SECTION_ATTRIBUTE = "dataFootnotes";
const FOOTNOTE_ID_PREFIX_PATTERN = /^(?:user-content-)?fn-(.+)$/;

/** Element tags that can contain a footnote reference in flow content. */
const BLOCK_TAG_NAMES = new Set([
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

type FootnoteNote = {
  key: string;
  bodyHtml: string;
  index: string;
  used: boolean;
};

type BlockContainer = {
  container: HastElementNode;
  parent: HastElementNode | null;
};

type Insertion = {
  parent: HastElementNode;
  container: HastElementNode;
  htmls: string[];
};

const SIDENOTES_REF_CLASS = "rr-sidenotes__ref";

export function rehypeSidenotes(options: SidenotesOptions = {}) {
  const resolved = resolveSidenotesOptions(options);
  return (tree: HastNode): void => {
    transformSidenotes(tree, resolved);
  };
}

function transformSidenotes(
  tree: HastNode,
  options: ResolvedSidenotesOptions,
): void {
  const section = findFootnoteSection(tree);
  if (!section) return;

  const notes = collectFootnoteNotes(section);
  if (notes.size === 0) return;

  addClassName(section, SIDENOTES_FOOTNOTES_CLASS);

  const insertions: Insertion[] = [];
  walkElements(tree, [], (ref, parent, index, ancestors) => {
    if (!isFootnoteReference(ref)) return;

    const href = getStringProperty(ref, "href");
    if (!href) return;
    const key = sidenotesKey(href);
    if (!key) return;
    const note = notes.get(key);
    if (!note) return;

    const noteIndex = getTextContent(ref);
    const toggleHtml = renderSidenotesReference({
      href,
      id: getStringProperty(ref, "id") ?? "",
      index: noteIndex,
      options,
    });

    if (parent.tagName === "sup") {
      addClassName(parent, SIDENOTES_REF_CLASS);
      (parent.children ?? []).splice(index, 1, rawNode(toggleHtml));
    } else {
      (parent.children ?? []).splice(
        index,
        1,
        rawNode(`<sup class="${SIDENOTES_REF_CLASS}">${toggleHtml}</sup>`),
      );
    }

    if (note.used) return;
    const { container, parent: containerParent } = findBlockContainer(
      parent,
      ancestors,
    );
    if (!containerParent) return;

    note.used = true;
    note.index = noteIndex;
    const noteHtml = renderSidenotesNote({
      key,
      index: noteIndex,
      bodyHtml: note.bodyHtml,
      options,
    });

    let insertion = insertions.find((entry) => entry.container === container);
    if (!insertion) {
      insertion = { parent: containerParent, container, htmls: [] };
      insertions.push(insertion);
    }
    insertion.htmls.push(noteHtml);
  });

  applyInsertions(insertions);
}

function findFootnoteSection(node: HastNode): HastElementNode | null {
  if (
    node.type === "element" &&
    node.tagName === "section" &&
    hasProperty(node, FOOTNOTES_SECTION_ATTRIBUTE)
  ) {
    return node;
  }
  for (const child of getChildren(node)) {
    if (child.type !== "element") continue;
    const found = findFootnoteSection(child);
    if (found) return found;
  }
  return null;
}

function collectFootnoteNotes(
  section: HastElementNode,
): Map<string, FootnoteNote> {
  const notes = new Map<string, FootnoteNote>();
  const list = (section.children ?? []).find(
    (child): child is HastElementNode =>
      child.type === "element" && child.tagName === "ol",
  );
  if (!list) return notes;

  for (const child of list.children ?? []) {
    if (child.type !== "element" || child.tagName !== "li") continue;
    const id = getStringProperty(child, "id") ?? "";
    const match = FOOTNOTE_ID_PREFIX_PATTERN.exec(id);
    if (!match) continue;
    const key = match[1];
    notes.set(key, {
      key,
      bodyHtml: renderHastChildren(
        stripDefinitionContent(child.children ?? []),
      ),
      index: "",
      used: false,
    });
  }
  return notes;
}

/** Keeps definition content, dropping whitespace-only text and back-links. */
function stripDefinitionContent(children: readonly HastNode[]): HastNode[] {
  const result: HastNode[] = [];
  for (const child of children) {
    const stripped = stripDefinitionNode(child);
    if (stripped) result.push(stripped);
  }
  // Removing a trailing back-link leaves a dangling space at the end.
  const last = result[result.length - 1];
  if (last?.type === "text") {
    result[result.length - 1] = { type: "text", value: last.value.trimEnd() };
  }
  return result;
}

function stripDefinitionNode(node: HastNode): HastNode | null {
  if (node.type === "text") {
    return node.value.trim() === "" ? null : node;
  }
  if (node.type !== "element") return node;
  if (hasProperty(node, "dataFootnoteBackref")) return null;
  return {
    ...node,
    children: stripDefinitionContent(node.children ?? []),
  };
}

function walkElements(
  node: HastNode,
  ancestors: readonly HastElementNode[],
  onReference: (
    ref: HastElementNode,
    parent: HastElementNode,
    index: number,
    ancestors: readonly HastElementNode[],
  ) => void,
): void {
  if (node.type !== "element" && node.type !== "root") return;
  const parent = node as HastElementNode;
  const children = parent.children ?? [];
  for (let index = 0; index < children.length; index += 1) {
    const child = children[index];
    if (child.type !== "element") continue;
    if (isFootnoteReference(child)) {
      onReference(child, parent, index, ancestors);
      continue;
    }
    walkElements(child, [parent, ...ancestors], onReference);
  }
}

function findBlockContainer(
  parent: HastElementNode,
  ancestors: readonly HastElementNode[],
): BlockContainer {
  const chain = [parent, ...ancestors];
  for (let index = 0; index < chain.length; index += 1) {
    if (BLOCK_TAG_NAMES.has(chain[index].tagName)) {
      return {
        container: chain[index],
        parent: chain[index + 1] ?? null,
      };
    }
  }
  return { container: chain[chain.length - 1], parent: null };
}

function applyInsertions(insertions: readonly Insertion[]): void {
  for (const insertion of insertions) {
    const siblings = insertion.parent.children ?? [];
    const index = siblings.indexOf(insertion.container);
    if (index === -1) continue;
    siblings.splice(index + 1, 0, ...insertion.htmls.map(rawNode));
  }
}

function isFootnoteReference(node: HastElementNode): boolean {
  return (
    node.tagName === "a" && hasProperty(node, FOOTNOTE_REFERENCE_ATTRIBUTE)
  );
}

function rawNode(value: string): HastRawNode {
  return { type: "raw", value };
}

function addClassName(node: HastElementNode, className: string): void {
  node.properties = {
    ...node.properties,
    className: mergeClassName(node.properties?.className, className),
  };
}

function mergeClassName(current: unknown, next: string): string {
  const currentClass = Array.isArray(current)
    ? current.join(" ")
    : typeof current === "string"
      ? current
      : "";
  return currentClass === "" ? next : `${currentClass} ${next}`;
}

function getStringProperty(node: HastElementNode, key: string): string | null {
  const value = getProperty(node, key);
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}

function hasProperty(node: HastElementNode, key: string): boolean {
  return getProperty(node, key) !== undefined;
}

function getProperty(node: HastElementNode, key: string): unknown {
  const value = node.properties?.[key];
  if (value !== undefined) return value;
  const hyphenated = key.replace(
    /[A-Z]/g,
    (letter) => `-${letter.toLowerCase()}`,
  );
  if (hyphenated !== key) return node.properties?.[hyphenated];
  return undefined;
}

function getTextContent(node: HastNode): string {
  if (node.type === "text" && typeof node.value === "string") {
    return node.value;
  }
  return getChildren(node).map(getTextContent).join("");
}

function getChildren(node: HastNode): HastNode[] {
  const children = (node as { children?: unknown }).children;
  return Array.isArray(children) ? (children as HastNode[]) : [];
}
