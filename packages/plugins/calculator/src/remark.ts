import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import {
  DEFAULT_CALCULATOR_CLASS,
  DEFAULT_CALCULATOR_LANGUAGE,
  renderCalculator,
} from "./render.js";

type RemarkCalculatorOptions = {
  readonly language?: string;
  readonly className?: string;
};

export function remarkCalculator(options: RemarkCalculatorOptions = {}) {
  const language = options.language ?? DEFAULT_CALCULATOR_LANGUAGE;
  const className = options.className ?? DEFAULT_CALCULATOR_CLASS;

  return (tree: Root) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const html: Html = {
        type: "html",
        value: renderCalculator(node.value, className),
      };
      parent.children.splice(index, 1, html);
    });
  };
}
