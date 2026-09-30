import { type ContentSource, readContentSourceEntry } from "@riebeckite/core";
import { parseCanvas } from "./parse.js";
import { renderCanvas } from "./render.js";
import { createCanvasResolver, lookupContentIndex } from "./resolve.js";
import type { ResolvedCanvasOptions } from "./types.js";

export type RemarkCanvasOptions = {
  options: ResolvedCanvasOptions;
  contentIndex: Map<string, string>;
  contentSource?: ContentSource;
};

type MdNode = {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MdNode[];
};

type CodeTarget = {
  parent: MdNode;
  index: number;
  node: MdNode;
};

const EMBED_PATTERN = /^!?\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|([^\]]+))?\]\]$/;

export function remarkCanvas(input: RemarkCanvasOptions) {
  const language = input.options.language;

  return async (tree: MdNode, file: unknown) => {
    const targets: CodeTarget[] = [];
    walk(tree, (node, parent, index) => {
      if (node.type !== "code" || node.lang !== language) return;
      if (!parent || index === undefined) return;
      targets.push({ parent, index, node });
    });

    for (const target of targets.reverse()) {
      await replaceCanvasBlock(target, input, file);
    }
  };
}

async function replaceCanvasBlock(
  target: CodeTarget,
  input: RemarkCanvasOptions,
  file: unknown,
) {
  const source = target.node.value ?? "";
  const embed = source.trim().match(EMBED_PATTERN);
  const content = embed
    ? await readEmbed(source, embed[1]?.trim() ?? "", input, file)
    : { json: source, source: "inline" };
  if (!content) return;

  const document = parseCanvas(content.json);
  if (!document) {
    reportCanvasDiagnostic(
      file,
      `Canvas block could not be parsed as JSON Canvas.`,
    );
    return;
  }

  const resolver = createCanvasResolver(input.contentIndex);
  target.parent.children ??= [];
  target.parent.children[target.index] = {
    type: "html",
    value: renderCanvas({
      document,
      source: content.source,
      options: input.options,
      resolver,
    }),
  } as MdNode;
}

async function readEmbed(
  source: string,
  target: string,
  input: RemarkCanvasOptions,
  file: unknown,
): Promise<{ json: string; source: string } | null> {
  const label = target || source.trim();
  if (!input.contentSource) {
    reportCanvasDiagnostic(
      file,
      `Canvas embed \`${label}\` could not be read (no content source).`,
    );
    return null;
  }

  const resolved = lookupContentIndex(input.contentIndex, target) ?? target;
  const entry = await readContentSourceEntry(input.contentSource, resolved);
  if (entry === null) {
    reportCanvasDiagnostic(
      file,
      `Canvas embed \`${label}\` could not be read.`,
    );
    return null;
  }

  return {
    json: typeof entry === "string" ? entry : new TextDecoder().decode(entry),
    source: resolved,
  };
}

function reportCanvasDiagnostic(file: unknown, message: string) {
  const reporter = (file as { message?: (reason: string) => unknown })?.message;
  if (typeof reporter !== "function") return;
  const diagnostic = reporter.call(file, message);
  if (diagnostic && typeof diagnostic === "object") {
    Object.assign(diagnostic, { source: "@riebeckite/plugin-canvas" });
  }
}

function walk(
  node: MdNode,
  visitor: (node: MdNode, parent?: MdNode, index?: number) => void,
  parent?: MdNode,
  index?: number,
) {
  visitor(node, parent, index);
  if (!Array.isArray(node.children)) return;
  for (const [childIndex, child] of node.children.entries()) {
    walk(child, visitor, node, childIndex);
  }
}
