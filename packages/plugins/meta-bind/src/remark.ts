import type { Code, Html, InlineCode, Root } from "mdast";
import { visit } from "unist-util-visit";
import { parseMetaBind } from "./parse.js";
import { renderMetaBind } from "./render.js";

type MessageFile = {
  data?: { matter?: unknown };
  message?: (reason: string) => unknown;
};

export function remarkMetaBind() {
  return (tree: Root, file?: unknown): void => {
    const frontmatter = readFrontmatter(file);
    visit(tree, "inlineCode", (node, index, parent) => {
      if (!parent || index === undefined) return;
      replaceInline(node, parent.children, index, frontmatter, file);
    });
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== "meta-bind" || !parent || index === undefined) return;
      replaceBlock(node, parent.children, index, frontmatter, file);
    });
  };
}

function replaceInline(
  node: InlineCode,
  children: Root["children"],
  index: number,
  frontmatter: Readonly<Record<string, unknown>>,
  file: unknown,
): void {
  const parsed = parseMetaBind(node.value);
  if (parsed.ok === false) {
    report(file, parsed.message);
    return;
  }
  children.splice(index, 1, {
    type: "html",
    value: renderMetaBind(parsed.value, frontmatter),
  } as Html);
}

function replaceBlock(
  node: Code,
  children: Root["children"],
  index: number,
  frontmatter: Readonly<Record<string, unknown>>,
  file: unknown,
): void {
  const fields = node.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (fields.length === 0) {
    report(file, "A meta-bind block needs an INPUT or VIEW field.");
    return;
  }
  const parsed = fields.map((field) => parseMetaBind(field, false));
  const failed = parsed.find((result) => !result.ok);
  if (failed?.ok === false) {
    report(file, failed.message);
    return;
  }
  const html = parsed
    .map((result) =>
      renderMetaBind(
        (result as Extract<typeof result, { ok: true }>).value,
        frontmatter,
      ),
    )
    .join("");
  children.splice(index, 1, {
    type: "html",
    value: `<div class="rb-meta-bind__block">${html}</div>`,
  } as Html);
}

function readFrontmatter(file: unknown): Readonly<Record<string, unknown>> {
  const value = (file as MessageFile | undefined)?.data?.matter;
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function report(file: unknown, message: string): void {
  const reporter = (file as MessageFile | undefined)?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, `Meta Bind: ${message}`);
  if (diagnostic && typeof diagnostic === "object")
    Object.assign(diagnostic, {
      source: "@riebeckite/plugin-meta-bind",
      ruleId: "meta-bind-parse",
    });
}
