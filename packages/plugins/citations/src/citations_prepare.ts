import type { Root } from "mdast";
import { findCitations } from "./citations_transform.js";
import type { MarkdownFile, Tree } from "./citations_types.js";

export const BLOCKING_ANCESTORS = new Set([
  "link",
  "linkReference",
  "definition",
  "inlineCode",
  "code",
  "html",
  "yaml",
  "toml",
]);

export function readFrontmatter(
  file: MarkdownFile,
): Record<string, unknown> | undefined {
  const matter = file.data?.matter;
  return typeof matter === "object" && matter !== null
    ? (matter as Record<string, unknown>)
    : undefined;
}

export function prepareTree(root: Root, blocked: WeakSet<object>): void {
  prepareNode(root, blocked, false);
}

export function prepareNode(
  node: Tree,
  blocked: WeakSet<object>,
  insideBlocked: boolean,
): void {
  const children = node.children;
  if (!children) return;
  const isBlocked =
    insideBlocked ||
    (node.type !== undefined && BLOCKING_ANCESTORS.has(node.type));
  if (!isBlocked) repairSplitCitations(children);

  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const candidate = child as Tree;
    if (candidate.type === "text") {
      if (isBlocked) blocked.add(candidate);
      continue;
    }
    prepareNode(candidate, blocked, isBlocked);
  }
}

export function repairSplitCitations(children: unknown[]): void {
  for (let index = 1; index < children.length; index += 1) {
    const node = children[index] as Tree | undefined;
    if (node?.type !== "textDirective") continue;

    const previous = children[index - 1] as Tree | undefined;
    if (previous?.type !== "text" || typeof previous.value !== "string") {
      continue;
    }
    if (Array.isArray(node.children) && node.children.length > 0) continue;
    if (node.attributes && Object.keys(node.attributes).length > 0) continue;

    const junction = previous.value.length;
    const following = children[index + 1] as Tree | undefined;
    const followingValue =
      following?.type === "text" && typeof following.value === "string"
        ? following.value
        : "";
    const merged = `${previous.value}:${node.name ?? ""}${followingValue}`;
    if (!spansCitation(merged, junction)) continue;

    previous.value = merged;
    if (followingValue) children.splice(index + 1, 1);
    children.splice(index, 1);
    index -= 1;
  }
}

export function spansCitation(value: string, junction: number): boolean {
  return findCitations(value).some(
    (match) => match.start < junction && match.end > junction,
  );
}
