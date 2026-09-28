import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { matter } from "vfile-matter";
import { parseBases } from "./parse.js";
import { createBasesPlaceholder } from "./placeholder.js";

export type RemarkBasesOptions = {
  /** Fenced code block language treated as a Base. Defaults to `base`. */
  language?: string;
};

/**
 * Replaces fenced `base` code blocks with a build-time placeholder.
 *
 * The YAML body is parsed immediately so that invalid or unsupported
 * definitions can be reported and left untouched (the code block survives);
 * the compiled spec is carried inside the placeholder and rendered later, once
 * the content manifest exists.
 */
export function remarkBases(options: RemarkBasesOptions = {}) {
  const language = options.language ?? "base";

  return (tree: Root, file: unknown) => {
    visit(tree, "code", (node, index, parent) => {
      if (node.lang !== language) return;
      if (!parent || index === undefined) return;

      const parsed = parseYaml(node.value);
      if (parsed.ok === false) {
        reportDiagnostic(file, parsed.message, node);
        return;
      }

      const spec = parseBases(parsed.value);
      if (spec.ok === false) {
        reportDiagnostic(file, spec.message, node);
        return;
      }

      const html: Html = {
        type: "html",
        value: createBasesPlaceholder({ spec: spec.value, source: node.value }),
      };
      parent.children.splice(index, 1, html);
    });
  };
}

function parseYaml(
  source: string,
): { readonly ok: true; readonly value: unknown } | {
  readonly ok: false;
  readonly message: string;
} {
  try {
    const document = `---\n${source}\n---\n`;
    const file = {
      value: document,
      data: {} as Record<string, unknown>,
      toString: () => document,
    };
    matter(file as unknown as Parameters<typeof matter>[0]);
    return { ok: true, value: file.data.matter };
  } catch (error) {
    return {
      ok: false,
      message: `Base block is not valid YAML (${formatError(error)}).`,
    };
  }
}

function reportDiagnostic(
  file: unknown,
  message: string,
  node: unknown,
): void {
  const reporter = (file as { message?: (...args: unknown[]) => unknown })
    ?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message, node);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, { source: "@riebeckite/plugin-bases" });
  }
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
