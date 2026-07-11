import { visit } from "unist-util-visit";
import type { Blockquote, Paragraph, Root, Text } from "mdast";
import type { Parent } from "unist";

export interface CalloutOptions {
  defaultTitles?: Record<string, string>;
}

const CALLOUT_RE = /^\[!([\w-]+)\]([+-])?\s*(.*)$/;

const DEFAULT_TITLES: Record<string, string> = {
  note: "Note",
  abstract: "Abstract",
  summary: "Summary",
  tldr: "TL;DR",
  info: "Info",
  todo: "Todo",
  tip: "Tip",
  hint: "Tip",
  important: "Important",
  success: "Success",
  check: "Success",
  done: "Success",
  question: "Question",
  help: "Help",
  faq: "FAQ",
  warning: "Warning",
  caution: "Warning",
  attention: "Warning",
  failure: "Failure",
  fail: "Failure",
  missing: "Failure",
  danger: "Danger",
  error: "Danger",
  bug: "Bug",
  example: "Example",
  quote: "Quote",
  cite: "Quote",
};

export function remarkObsidianCallout(opt: CalloutOptions = {}) {
  const defaultTitles = { ...DEFAULT_TITLES, ...(opt.defaultTitles ?? {}) };

  return (tree: Root) => {
    visit(
      tree,
      "blockquote",
      (node: Blockquote, index, parent: Parent | undefined) => {
        if (!parent || index == undefined) return;

        const marker = extractMarker(node);
        if (!marker) return;

        const { type, fold, title, consumedParagraph } = marker;
        const resolvedTitle = title || defaultTitles[type] || capitalize(type);

        const bodyChildren: any[] = consumedParagraph
          ? node.children.slice(1)
          : node.children;

        const titleNode: any = {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { className: ["callout-title", `callout-${type}-title`] },
          },
          children: [
            {
              type: "paragraph",
              data: {
                hName: "div",
                hProperties: { className: ["callout-icon"] },
              },
              children: [],
            },
            {
              type: "paragraph",
              data: {
                hName: "div",
                hProperties: { className: ["callout-title-inner"] },
              },
              children: [{ type: "text", value: resolvedTitle }],
            },
          ],
        };

        const contentNode: any = {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { className: ["callout-content"] },
          },
          children: bodyChildren,
        };

        const className = ["callout", `callout-${type}`];
        if (fold) className.push("is-collapsible");
        if (fold === "-") className.push("is-collapsed");

        node.data = {
          ...node.data,
          hName: "div",
          hProperties: {
            className,
            "data-callout": type,
            ...(fold ? { "data-callout-fold": fold } : {}),
          },
        };

        node.children = (
          bodyChildren.length > 0 ? [titleNode, contentNode] : [titleNode]
        ) as any;
      },
    );
  };
}

type Marker = {
  type: string;
  fold?: "+" | "-";
  title: string;
  consumedParagraph: boolean;
};

function extractMarker(node: Blockquote): Marker | null {
  const first = node.children[0];
  if (!first || first.type !== "paragraph") return null;

  const firstChild = (first as Paragraph).children[0];
  if (!firstChild || firstChild.type !== "text") return null;

  const text = firstChild as Text;
  const lines = text.value.split("\n");
  const match = lines[0].match(CALLOUT_RE);
  if (!match) return null;

  const [, rawType, rawFold, rawTitle] = match;
  const type = rawType.toLowerCase();
  const fold = rawFold as "+" | "-" | undefined;
  const title = rawTitle.trim();

  const rest = lines.slice(1).join("\n");
  if (rest.length > 0) {
    text.value = rest;
  } else {
    (first as Paragraph).children.shift();
  }

  const consumedParagraph = (first as Paragraph).children.length === 0;

  return { type, fold, title, consumedParagraph };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
