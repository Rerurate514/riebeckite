import {
  deserializeCodeDiff,
  extractCodeDiffMeta,
  removeCodeDiffMeta,
} from "./annotations.js";
import {
  element,
  getBooleanProperty,
  getDataMeta,
  getStringProperty,
  isElementNode,
  mergeClassName,
  text,
  visitElementTree,
} from "./hast.js";
import type { ElementNode, HastNode } from "./types.js";

export function rehypeCodeAnnotations() {
  return (tree: HastNode): void => {
    visitElementTree(tree, (node, ancestors) => {
      if (node.tagName !== "code") return;
      const pre = ancestors[ancestors.length - 1];
      if (pre?.tagName !== "pre") return;

      const figure = findFigure(ancestors);
      const plan = readPlan(node, pre, figure);
      stripDiffFromProperties(node);
      if (!plan) return;

      const lines = getLineElements(node);
      const codeLines = lines.length > 0 ? lines : wrapCodeLines(node);
      codeLines.forEach((line, index) => {
        const marker = plan.markers[index];
        if (!marker) return;
        line.properties = {
          ...line.properties,
          className: mergeClassName(
            line.properties?.className,
            marker === "+" ? "rr-code__line--add" : "rr-code__line--remove",
          ),
        };
        line.children = [
          element(
            "span",
            { className: "rr-code__diff-marker", ariaHidden: "true" },
            [text(marker)],
          ),
          ...(line.children ?? []),
        ];
      });
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
) {
  const fromAttribute = deserializeCodeDiff(
    getStringProperty(code, "dataRbCodeDiff") ??
      getStringProperty(code, "data-rb-code-diff"),
  );
  if (fromAttribute) return fromAttribute;

  for (const meta of [
    getDataMeta(figure),
    getDataMeta(pre),
    getDataMeta(code),
  ]) {
    const plan = extractCodeDiffMeta(meta);
    if (plan) return plan;
  }
  return null;
}

function stripDiffFromProperties(code: ElementNode): void {
  if (!code.properties) return;
  delete code.properties["data-rb-code-diff"];
  delete code.properties.dataRbCodeDiff;
  for (const key of ["data-meta", "dataMeta"] as const) {
    const value = code.properties[key];
    if (typeof value !== "string") continue;
    const stripped = removeCodeDiffMeta(value);
    if (stripped !== "") code.properties[key] = stripped;
    else delete code.properties[key];
  }
}

function getLineElements(code: ElementNode): ElementNode[] {
  return (code.children ?? []).filter(isElementNode).filter((child) => {
    if (child.tagName !== "span") return false;
    return getBooleanProperty(child, "dataLine");
  });
}

function wrapCodeLines(code: ElementNode): ElementNode[] {
  const lines = (code.children ?? [])
    .filter((child) => child.type === "text")
    .flatMap((child) =>
      (child as { value: string }).value.replace(/\n$/, "").split("\n"),
    );
  const wrapped = lines.map((line, index) =>
    element(
      "span",
      { className: "rr-code__line", dataLine: String(index + 1) },
      [text(line)],
    ),
  );
  code.children = wrapped.flatMap((line, index) =>
    index < wrapped.length - 1 ? [line, text("\n")] : [line],
  );
  return wrapped;
}
