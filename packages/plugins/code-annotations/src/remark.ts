import {
  appendCodeDiffMeta,
  collectCodeDiff,
  serializeCodeDiff,
} from "./annotations.js";

type MdastNode = {
  type?: string;
  lang?: unknown;
  value?: unknown;
  meta?: unknown;
  data?: Record<string, unknown>;
  children?: MdastNode[];
};

export function remarkCodeAnnotations() {
  return (tree: unknown): void => {
    visitMdast(tree as MdastNode, (node) => {
      if (
        node.type !== "code" ||
        node.lang !== "diff" ||
        typeof node.value !== "string"
      ) {
        return;
      }

      const language = parseTargetLanguage(node.meta);
      if (!language) return;

      const { code, plan } = collectCodeDiff(node.value);
      node.lang = language;
      node.value = code;
      const hProperties = {
        ...(node.data?.hProperties as Record<string, unknown> | undefined),
      };
      hProperties["data-rb-code-diff"] = serializeCodeDiff(plan);
      hProperties["data-meta"] = appendCodeDiffMeta(node.meta as string, plan);
      node.data = { ...(node.data ?? {}), hProperties };
    });
  };
}

function parseTargetLanguage(meta: unknown): string | null {
  if (typeof meta !== "string") return null;
  const language = meta.trim().split(/\s+/, 1)[0];
  return language && /^[\w#+.-]+$/.test(language) ? language : null;
}

function visitMdast(node: MdastNode, visitor: (node: MdastNode) => void): void {
  visitor(node);
  for (const child of node.children ?? []) visitMdast(child, visitor);
}
