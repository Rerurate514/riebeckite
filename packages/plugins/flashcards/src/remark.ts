import { reportVFileDiagnostic } from "@riebeckite/core";
import type { Code, Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { parseFlashcards } from "./parse.js";
import { createFlashcardsPlaceholder } from "./placeholder.js";

const FLASHCARDS_DIAGNOSTIC_SOURCE = "@riebeckite/plugin-flashcards";

type RemarkFlashcardsOptions = {
  language?: string;
};

export function remarkFlashcards(options: RemarkFlashcardsOptions = {}) {
  const language = options.language ?? "flashcards";

  return (tree: Root, file?: unknown) => {
    visit(tree, "code", (node: Code, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const parsed = parseFlashcards(node.value);
      if (parsed.ok === false) {
        reportInvalidBlock(file, parsed.reason);
        return;
      }

      const html: Html = {
        type: "html",
        value: createFlashcardsPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}

function reportInvalidBlock(file: unknown, reason: string) {
  reportVFileDiagnostic(file, {
    source: FLASHCARDS_DIAGNOSTIC_SOURCE,
    ruleId: "invalid-flashcards",
    message: `Invalid flashcards block: ${reason}.`,
  });
}
