import rehypePrettyCode from "rehype-pretty-code";
import {
  element,
  getBooleanProperty,
  getStringProperty,
  getTextContent,
  mergeClassName,
  text,
  visitElements,
} from "./hast.js";
import type { CodeEnhanceOptions, ElementNode, HastNode } from "./types.js";

const DEFAULT_THEME = {
  light: "github-light",
  dark: "github-dark",
};

export function rehypeCodeEnhance(options: CodeEnhanceOptions = {}) {
  const prettyCode = rehypePrettyCode({
    theme: (options.theme ?? DEFAULT_THEME) as never,
    keepBackground: false,
    defaultLang: { block: "text", inline: "text" },
    onVisitLine(node: ElementNode) {
      node.properties = {
        ...node.properties,
        className: mergeClassName(node.properties?.className, "rr-code__line"),
      };
    },
    onVisitHighlightedLine(node: ElementNode) {
      if (options.lineHighlight === false) return;
      node.properties = {
        ...node.properties,
        className: mergeClassName(
          node.properties?.className,
          "rr-code__line--highlighted",
        ),
      };
    },
    onVisitHighlightedChars(node: ElementNode) {
      if (options.lineHighlight === false) return;
      node.properties = {
        ...node.properties,
        className: mergeClassName(
          node.properties?.className,
          "rr-code__chars--highlighted",
        ),
      };
    },
  });

  return async (tree: HastNode, file: unknown) => {
    restoreCodeMeta(tree);
    if (typeof prettyCode === "function") {
      await (
        prettyCode as (tree: HastNode, file: unknown) => Promise<void> | void
      )(tree, file);
    }
    enhancePrettyCodeFigures(tree, options);
  };
}

function restoreCodeMeta(tree: HastNode) {
  visitElements(tree, (node) => {
    if (node.tagName !== "pre") return;
    const code = findDirectChild(node, "code");
    if (!code) return;
    const meta = getCodeMeta(code);
    if (!meta) return;
    node.data = { ...getRecord(node.data), meta };
  });
}

function getCodeMeta(node: ElementNode): string | null {
  const dataMeta = getDataMeta(node);
  return (
    dataMeta ??
    getStringProperty(node, "meta") ??
    getStringProperty(node, "dataMeta") ??
    getStringProperty(node, "data-meta") ??
    getStringProperty(node, "metastring")
  );
}

function getDataMeta(node: ElementNode): string | null {
  const data = node.data;
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  const meta = (data as { meta?: unknown }).meta;
  return typeof meta === "string" ? meta : null;
}

function getRecord(data: unknown): Record<string, unknown> {
  return data !== null && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function enhancePrettyCodeFigures(tree: HastNode, options: CodeEnhanceOptions) {
  visitElements(tree, (node) => {
    if (!isPrettyCodeFigure(node)) return;

    const pre = findDirectChild(node, "pre");
    if (!pre) return;

    const code = findDirectChild(pre, "code");
    const titleNode = findTitleNode(node);
    const title = titleNode ? getTextContent(titleNode) : null;
    const language = getLanguage(pre, code);
    const rawCode = code ? getTextContent(code) : getTextContent(pre);
    const isTerminal =
      options.terminal !== false && isTerminalLanguage(language);

    node.properties = {
      ...node.properties,
      className: mergeClassName(node.properties?.className, "rr-code"),
      dataLanguage: language,
      dataTerminal: isTerminal ? "true" : undefined,
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
      if (options.diffHighlight !== false) markDiffLines(code);
      if (options.commandPrompt !== false && isTerminal)
        markCommandPrompts(code);
    }

    const bodyChildren =
      node.children?.filter((child) => child !== titleNode) ?? [];
    const body = element("div", { className: "rr-code__body" }, bodyChildren);
    node.children = [
      buildHeader({
        title: options.filename === false ? null : title,
        language,
        rawCode,
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

function buildHeader(input: {
  title: string | null;
  language: string;
  rawCode: string;
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
          dataCode: input.rawCode,
          ariaLabel: "コードをコピー",
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

function markLineNumbers(code: ElementNode) {
  for (const [index, line] of getCodeLines(code).entries()) {
    line.properties = {
      ...line.properties,
      dataLineNumber: String(index + 1),
    };
  }
}

function markDiffLines(code: ElementNode) {
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

function markCommandPrompts(code: ElementNode) {
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

function getCodeLines(code: ElementNode): ElementNode[] {
  return (code.children ?? []).filter(
    (child): child is ElementNode =>
      child.type === "element" &&
      child.tagName === "span" &&
      getBooleanProperty(child, "dataLine"),
  );
}

function isPrettyCodeFigure(node: ElementNode): boolean {
  return (
    node.tagName === "figure" &&
    getBooleanProperty(node, "dataRehypePrettyCodeFigure")
  );
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

function findTitleNode(node: ElementNode): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" &&
        getBooleanProperty(child, "dataRehypePrettyCodeTitle"),
    ) ?? null
  );
}

function getLanguage(pre: ElementNode, code: ElementNode | null): string {
  const language =
    getStringProperty(pre, "dataLanguage") ??
    getStringProperty(code ?? pre, "dataLanguage");
  return language ?? "text";
}

function isTerminalLanguage(language: string): boolean {
  return ["bash", "console", "sh", "shell", "terminal", "zsh"].includes(
    language,
  );
}
