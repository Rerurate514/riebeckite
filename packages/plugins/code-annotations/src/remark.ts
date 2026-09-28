import {
  appendAnnotationsMeta,
  collectCodeAnnotations,
  encodeAnnotationsMeta,
  serializeAnnotations,
} from "./annotations.js";
import { resolveCodeAnnotationsOptions } from "./options.js";
import type { ResolvedCodeAnnotationsOptions } from "./types.js";

type MdastNode = {
  type?: string;
  lang?: unknown;
  value?: unknown;
  meta?: unknown;
  data?: Record<string, unknown>;
  children?: MdastNode[];
};

/**
 * Reads the fence meta and inline `[!code ...]` markers of every code block,
 * strips the marker comments from the code text, and records the resulting
 * plan for the rehype stage.
 *
 * The plan travels through two properties:
 *
 * - `data-rb-code-annotations` is the primary channel and is read directly for
 *   plain `<pre><code>` blocks.
 * - `data-meta` carries an encoded copy because
 *   `rehype-pretty-code` (used by `@riebeckite/plugin-code-enhance`) replaces
 *   the `<code>` element and drops its properties. code-enhance already reads
 *   `data-meta`, so the copy survives on the generated `<figure>`.
 */
export function remarkCodeAnnotations(
  options: ResolvedCodeAnnotationsOptions = resolveCodeAnnotationsOptions(),
) {
  return (tree: unknown): void => {
    visitMdast(tree as MdastNode, (node) => {
      if (node.type !== "code" || typeof node.value !== "string") return;
      if (options.language !== undefined && node.lang !== options.language) {
        return;
      }

      const meta = typeof node.meta === "string" ? node.meta : null;
      const { plan, code, hasAnnotations } = collectCodeAnnotations(
        meta,
        node.value,
      );
      if (!hasAnnotations) return;

      node.value = code;
      const hProperties = {
        ...(node.data?.hProperties as Record<string, unknown> | undefined),
      };
      hProperties["data-rb-code-annotations"] = serializeAnnotations(plan);

      const existingMeta = hProperties["data-meta"] ?? hProperties.dataMeta;
      hProperties["data-meta"] =
        typeof existingMeta === "string" && existingMeta !== ""
          ? appendAnnotationsMeta(existingMeta, plan)
          : encodeAnnotationsMeta(plan);

      node.data = { ...(node.data ?? {}), hProperties };
    });
  };
}

function visitMdast(node: MdastNode, visitor: (node: MdastNode) => void): void {
  visitor(node);
  for (const child of node.children ?? []) visitMdast(child, visitor);
}
