import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { isKanbanNote, parseKanban, stripFrontmatter } from "./parse.js";
import { createKanbanPlaceholder } from "./placeholder.js";
import { resolveKanbanOptions, type KanbanOptions } from "./types.js";

export type RemarkKanbanOptions = KanbanOptions;

type MessageFile = {
  message?: (reason: string) => unknown;
};

type ContentFile = {
  value?: unknown;
  data?: { matter?: unknown };
};

export function remarkKanban(options: KanbanOptions = {}) {
  const resolved = resolveKanbanOptions(options);

  return (tree: Root, file?: unknown) => {
    if (resolved.autoDetect && isKanbanNote(readMatter(file))) {
      reportProblems(file, "note", parseKanban(readBody(file), resolved));
    }

    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== resolved.language) return;
      if (!parent || index === undefined) return;

      reportProblems(file, "block", parseKanban(node.value, resolved));

      const html: Html = {
        type: "html",
        value: createKanbanPlaceholder(node.value),
      };
      parent.children.splice(index, 1, html);
    });
  };
}

function reportProblems(
  file: unknown,
  scope: "note" | "block",
  result: { problems: readonly string[] },
): void {
  if (result.problems.length === 0) return;
  const reporter = (file as MessageFile | undefined)?.message;
  if (typeof reporter !== "function") return;

  for (const problem of result.problems) {
    const diagnostic = reporter.call(file, `Kanban ${scope}: ${problem}`);
    if (diagnostic && typeof diagnostic === "object") {
      Object.assign(diagnostic, {
        source: "@riebeckite/plugin-kanban",
        ruleId: "kanban-parse",
      });
    }
  }
}

function readMatter(file: unknown): unknown {
  return (file as ContentFile | undefined)?.data?.matter;
}

function readBody(file: unknown): string {
  const value = (file as ContentFile | undefined)?.value;
  return typeof value === "string" ? stripFrontmatter(value) : "";
}
