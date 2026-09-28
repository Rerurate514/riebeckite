import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { parseDataview } from "./parse.js";
import { createDataviewPlaceholder } from "./placeholder.js";

export type RemarkDataviewOptions = {
  language?: string;
};

const DATAVIEW_SOURCE = "@riebeckite/plugin-dataview";

export function remarkDataview(options: RemarkDataviewOptions = {}) {
  const language = options.language ?? "dataview";
  const unsupportedLanguage = `${language}js`;

  return (tree: Root, file: unknown) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang === unsupportedLanguage) {
        reportDataviewMessage(
          file,
          `DataviewJS blocks (\`${unsupportedLanguage}\`) are not supported; the block was left as code.`,
        );
        return;
      }
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const parsed = parseDataview(node.value);
      if (parsed.status === "error") {
        reportDataviewMessage(
          file,
          `Unsupported dataview query: ${parsed.message}`,
        );
      }

      const html: Html = {
        type: "html",
        value: createDataviewPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}

function reportDataviewMessage(file: unknown, message: string): void {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, { source: DATAVIEW_SOURCE });
  }
}
