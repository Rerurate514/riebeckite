import type { Html, Root } from "mdast";
import { visit } from "unist-util-visit";
import { parseBases } from "./parse.js";
import { createBasesPlaceholder } from "./placeholder.js";
import { parseBasesYaml } from "./yaml.js";

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

      const parsed = parseBasesYaml(node.value);
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

function reportDiagnostic(file: unknown, message: string, node: unknown): void {
  const reporter = (file as { message?: (...args: unknown[]) => unknown })
    ?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message, node);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, { source: "@riebeckite/plugin-bases" });
  }
}
