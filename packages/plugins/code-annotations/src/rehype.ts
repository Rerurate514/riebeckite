import {
  deserializeAnnotations,
  extractAnnotationsMeta,
  hasAnnotations,
  removeAnnotationsMeta,
} from "./annotations.js";
import {
  element,
  getBooleanProperty,
  getClassNameList,
  getDataMeta,
  getStringProperty,
  getTextContent,
  hasProperty,
  isElementNode,
  mergeClassName,
  text,
  visitElementTree,
} from "./hast.js";
import { resolveCodeAnnotationsOptions } from "./options.js";
import type {
  CodeAnnotationPlan,
  ElementNode,
  HastNode,
  ResolvedCodeAnnotationsOptions,
} from "./types.js";

/**
 * Materializes annotation plans recorded by {@link remarkCodeAnnotations}.
 * Reuses existing per-line wrappers (for example the ones emitted by
 * `rehype-pretty-code` through `@riebeckite/plugin-code-enhance`) and falls
 * back to wrapping raw `<code>` text into `rb-code__line` spans.
 */
export function rehypeCodeAnnotations(
  options: ResolvedCodeAnnotationsOptions = resolveCodeAnnotationsOptions(),
) {
  return (tree: HastNode): void => {
    visitElementTree(tree, (node, ancestors) => {
      if (node.tagName !== "code") return;
      const parent = ancestors[ancestors.length - 1];
      if (parent?.tagName !== "pre") return;

      const pre = parent;
      const figure = findFigure(ancestors);
      const plan = readPlan(node, pre, figure);
      stripAnnotationsFromProperties(node);
      if (plan === null || !hasAnnotations(plan)) return;
      if (!languageMatches(node, options.language)) return;

      applyPlan(node, pre, figure, plan, options);
    });
  };
}

function findFigure(ancestors: ElementNode[]): ElementNode | null {
  for (let index = ancestors.length - 1; index >= 0; index -= 1) {
    if (getBooleanProperty(ancestors[index], "dataRehypePrettyCodeFigure")) {
      return ancestors[index];
    }
  }
  return null;
}

function readPlan(
  code: ElementNode,
  pre: ElementNode,
  figure: ElementNode | null,
): CodeAnnotationPlan | null {
  const fromAttribute = deserializeAnnotations(
    getStringProperty(code, "dataRbCodeAnnotations") ??
      getStringProperty(code, "data-rb-code-annotations"),
  );
  if (fromAttribute) return fromAttribute;

  const metas = [getDataMeta(figure), getDataMeta(pre), getDataMeta(code)];
  for (const meta of metas) {
    const plan = extractAnnotationsMeta(meta);
    if (plan) return plan;
  }
  return null;
}

function stripAnnotationsFromProperties(code: ElementNode): void {
  if (!code.properties) return;
  delete code.properties["data-rb-code-annotations"];
  delete code.properties.dataRbCodeAnnotations;

  for (const key of ["data-meta", "dataMeta"] as const) {
    const value = code.properties[key];
    if (typeof value !== "string") continue;
    const stripped = removeAnnotationsMeta(value);
    if (stripped !== "") code.properties[key] = stripped;
    else delete code.properties[key];
  }
}

function applyPlan(
  code: ElementNode,
  pre: ElementNode,
  figure: ElementNode | null,
  plan: CodeAnnotationPlan,
  options: ResolvedCodeAnnotationsOptions,
): void {
  const root =
    figure && getBooleanProperty(figure, "dataRehypePrettyCodeFigure")
      ? figure
      : pre;
  root.properties = {
    ...root.properties,
    className: mergeClassName(root.properties?.className, options.className),
  };

  const lines = getLineElements(code);
  if (lines.length > 0) {
    lines.forEach((line, index) => {
      applyLineClasses(line, index + 1, plan, options);
    });
    return;
  }

  // remark-rehype keeps a trailing newline that `rehype-pretty-code` strips;
  // drop it so standalone blocks do not render a trailing empty line.
  const rawLines = getTextContent(code).replace(/\n$/, "").split("\n");
  const children: HastNode[] = [];
  rawLines.forEach((lineText, index) => {
    const classNames = [
      options.lineClassName,
      ...annotationClassNames(index + 1, plan, options),
    ];
    children.push(
      element(
        "span",
        {
          className: classNames.join(" "),
          dataLine: String(index + 1),
        },
        [text(lineText)],
      ),
    );
    if (index < rawLines.length - 1) children.push(text("\n"));
  });
  code.children = children;
}

function applyLineClasses(
  line: ElementNode,
  lineNumber: number,
  plan: CodeAnnotationPlan,
  options: ResolvedCodeAnnotationsOptions,
): void {
  for (const name of annotationClassNames(lineNumber, plan, options)) {
    line.properties = {
      ...line.properties,
      className: mergeClassName(line.properties?.className, name),
    };
  }
}

function annotationClassNames(
  lineNumber: number,
  plan: CodeAnnotationPlan,
  options: ResolvedCodeAnnotationsOptions,
): string[] {
  const names: string[] = [];
  if (plan.highlight.includes(lineNumber)) {
    names.push(options.highlightClassName);
  }
  if (plan.added.includes(lineNumber)) names.push(options.addedClassName);
  if (plan.removed.includes(lineNumber)) names.push(options.removedClassName);
  if (plan.focus.includes(lineNumber)) names.push(options.focusClassName);
  return names;
}

function getLineElements(code: ElementNode): ElementNode[] {
  return (code.children ?? []).filter(isElementNode).filter((child) => {
    if (child.tagName !== "span") return false;
    if (hasProperty(child, "dataLine")) return true;
    const classNames = getClassNameList(child);
    return (
      classNames.includes("line") ||
      classNames.some((name) => name.endsWith("__line"))
    );
  });
}

function languageMatches(
  code: ElementNode,
  language: string | undefined,
): boolean {
  if (!language) return true;
  return detectLanguage(code) === language;
}

function detectLanguage(code: ElementNode): string | null {
  const explicit =
    getStringProperty(code, "dataLanguage") ??
    getStringProperty(code, "data-language");
  if (explicit) return explicit;
  for (const name of getClassNameList(code)) {
    if (name.startsWith("language-")) return name.slice("language-".length);
  }
  return null;
}
