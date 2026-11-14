import {
  findDirectChild,
  getLanguage,
  isDiffLanguage,
  isTerminalLanguage,
  SOURCE_FILE_TITLE_PREFIX,
} from "./code_enhance_meta.js";
import {
  element,
  getBooleanProperty,
  getTextContent,
  mergeClassName,
  text,
  visitElements,
} from "./hast.js";
import type { CodeEnhanceOptions, ElementNode, HastNode } from "./types.js";

export function enhancePrettyCodeFigures(
  tree: HastNode,
  options: CodeEnhanceOptions,
) {
  visitElements(tree, (node) => {
    if (!isPrettyCodeFigure(node)) return;

    const pre = findDirectChild(node, "pre");
    if (!pre) return;

    const code = findDirectChild(pre, "code");
    const titleNode = findTitleNode(node);
    const title = titleNode ? getTextContent(titleNode) : null;
    const sourceFileTitle = title?.startsWith(SOURCE_FILE_TITLE_PREFIX)
      ? title
      : null;
    const isSourceFile = sourceFileTitle !== null;
    const displayTitle = sourceFileTitle
      ? sourceFileTitle.slice(SOURCE_FILE_TITLE_PREFIX.length)
      : title;
    const language = getLanguage(pre, code);
    const isShell = isTerminalLanguage(language);

    node.properties = {
      ...node.properties,
      className: mergeClassName(node.properties?.className, "rr-code"),
      dataLanguage: language,
      ...(isSourceFile ? { dataSourceFile: "true" } : {}),
    };

    pre.properties = {
      ...pre.properties,
      className: mergeClassName(
        pre.properties?.className,
        options.wrapToggle ? "rr-code__pre rr-code__pre--wrap" : "rr-code__pre",
      ),
      tabindex: "0",
    };

    if (code) {
      code.properties = {
        ...code.properties,
        className: mergeClassName(code.properties?.className, "rr-code__code"),
      };
      if (options.lineNumbers) markLineNumbers(code);
      if (isSourceFile) markSourceFileLines(code);
      if (options.diffHighlight !== false && isDiffLanguage(language))
        markDiffLines(code);
      if (options.commandPrompt !== false && isShell) markCommandPrompts(code);
    }

    const bodyChildren =
      node.children?.filter((child) => child !== titleNode) ?? [];
    const body = element("div", { className: "rr-code__body" }, bodyChildren);
    node.children = [
      buildHeader({
        title: options.filename === false ? null : displayTitle,
        language,
        copyButton: options.copyButton !== false,
        wrapToggle: options.wrapToggle !== false,
        collapsible: options.collapsible === true,
      }),
      body,
    ];

    if (options.collapsible === true) {
      node.properties.dataCollapsible = "true";
      if (options.defaultCollapsed === true) {
        node.properties.dataCollapsed = "true";
        body.properties = { ...body.properties, hidden: true };
      }
    }
  });
}

export function buildHeader(input: {
  title: string | null;
  language: string;
  copyButton: boolean;
  wrapToggle: boolean;
  collapsible: boolean;
}): ElementNode {
  const actions: HastNode[] = [];
  if (input.wrapToggle) {
    actions.push(
      element(
        "button",
        {
          type: "button",
          className: "rr-code__action",
          dataCodeWrapToggle: "true",
          ariaPressed: "true",
        },
        [text("Wrap")],
      ),
    );
  }
  if (input.copyButton) {
    actions.push(
      element(
        "button",
        {
          type: "button",
          className: "rr-code__action",
          dataCodeCopy: "true",
          ariaLabel: "Copy code",
        },
        [text("Copy")],
      ),
    );
  }
  if (input.collapsible) {
    actions.push(
      element(
        "button",
        {
          type: "button",
          className: "rr-code__action",
          dataCodeCollapseToggle: "true",
          ariaExpanded: "true",
        },
        [text("Collapse")],
      ),
    );
  }

  return element("figcaption", { className: "rr-code__header" }, [
    element("span", { className: "rr-code__title" }, [
      text(input.title || input.language || "code"),
    ]),
    element("span", { className: "rr-code__actions" }, actions),
  ]);
}

export function markLineNumbers(code: ElementNode) {
  for (const [index, line] of getCodeLines(code).entries()) {
    line.properties = {
      ...line.properties,
      dataLineNumber: String(index + 1),
    };
  }
}

export function markSourceFileLines(code: ElementNode) {
  for (const [index, line] of getCodeLines(code).entries()) {
    line.properties = {
      ...line.properties,
      id: `L${index + 1}`,
      tabindex: "-1",
    };
  }
}

export function markDiffLines(code: ElementNode) {
  for (const line of getCodeLines(code)) {
    const content = getTextContent(line);
    if (content.startsWith("+")) {
      line.properties = {
        ...line.properties,
        className: mergeClassName(
          line.properties?.className,
          "rr-code__line--add",
        ),
      };
    }
    if (content.startsWith("-")) {
      line.properties = {
        ...line.properties,
        className: mergeClassName(
          line.properties?.className,
          "rr-code__line--remove",
        ),
      };
    }
  }
}

export function markCommandPrompts(code: ElementNode) {
  for (const line of getCodeLines(code)) {
    if (getTextContent(line).trim()) {
      line.properties = {
        ...line.properties,
        className: mergeClassName(
          line.properties?.className,
          "rr-code__line--prompt",
        ),
      };
    }
  }
}

export function getCodeLines(code: ElementNode): ElementNode[] {
  return (code.children ?? []).filter(
    (child): child is ElementNode =>
      child.type === "element" &&
      child.tagName === "span" &&
      getBooleanProperty(child, "dataLine"),
  );
}

export function isPrettyCodeFigure(node: ElementNode): boolean {
  return (
    node.tagName === "figure" &&
    getBooleanProperty(node, "dataRehypePrettyCodeFigure")
  );
}

export function findTitleNode(node: ElementNode): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" &&
        getBooleanProperty(child, "dataRehypePrettyCodeTitle"),
    ) ?? null
  );
}
