import type {
  ConfigValidationIssue,
  ContentManifest,
  ContentManifestEntry,
} from "@riebeckite/core";
import type {
  NavigationEntry,
  NavigationItem,
  NavigationOptions,
  NavigationSource,
  SiteNavigation,
} from "./types.js";

type TreeNode = {
  readonly segment: string;
  index?: NavigationEntry;
  page?: NavigationEntry;
  readonly children: Map<string, TreeNode>;
};

const ROOT_SEGMENT = "";

export const NAVIGATION_PLUGIN_NAME = "navigation";

export function buildNavigation(
  entries: readonly ContentManifestEntry[],
  options: NavigationOptions = {},
): SiteNavigation {
  return {
    primary: options.items ?? deriveNavigation(entries),
    secondary: options.secondary ?? [],
  };
}

export function resolveSiteNavigation(
  source: NavigationSource,
  manifest: ContentManifest,
): SiteNavigation | null {
  const plugin = source.plugins?.find(
    (candidate) =>
      candidate.name === NAVIGATION_PLUGIN_NAME && candidate.enabled !== false,
  );
  if (!plugin) return null;
  return buildNavigation(
    manifest.discoverableEntries,
    (plugin.options as NavigationOptions | undefined) ?? {},
  );
}

export function validateNavigationOptions(
  options: NavigationOptions | undefined,
): readonly ConfigValidationIssue[] {
  if (!options || typeof options !== "object") return [];
  const issues: ConfigValidationIssue[] = [];
  validateItems(options.items, "items", issues, new Set());
  validateItems(options.secondary, "secondary", issues, new Set());
  return issues;
}

function deriveNavigation(
  entries: readonly ContentManifestEntry[],
): readonly NavigationItem[] {
  const nodes = entries
    .map(toNavigationEntry)
    .filter((entry): entry is NavigationEntry => Boolean(entry));
  const root = createTreeNode(ROOT_SEGMENT);
  for (const node of nodes) addEntry(root, node);
  return buildItems(root);
}

function toNavigationEntry(
  entry: ContentManifestEntry,
): NavigationEntry | null {
  const segments = entry.slug.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  const isIndex = ["index", "README"].includes(segments.at(-1) ?? "");
  return {
    entry,
    segments,
    isIndex,
    title: resolveTitle(entry, segments),
  };
}

function resolveTitle(
  entry: ContentManifestEntry,
  segments: readonly string[],
): string {
  if (entry.title.trim()) return entry.title.trim();
  return titleFromSegment(segments.at(-1) ?? entry.slug);
}

function addEntry(root: TreeNode, entry: NavigationEntry): void {
  const path = entry.isIndex ? entry.segments.slice(0, -1) : entry.segments;
  let node = root;
  for (const segment of path) {
    const child = node.children.get(segment) ?? createTreeNode(segment);
    node.children.set(segment, child);
    node = child;
  }
  if (entry.isIndex) node.index = entry;
  else node.page = entry;
}

function buildItems(node: TreeNode): readonly NavigationItem[] {
  return [...node.children.values()].toSorted(compareNodes).map(nodeToItem);
}

function nodeToItem(node: TreeNode): NavigationItem {
  const primary = node.index ?? node.page;
  const children: NavigationItem[] = [
    ...(node.index && node.page ? [toItem(node.page)] : []),
    ...buildItems(node),
  ];
  if (primary) return toItem(primary, children);
  return {
    label: titleFromSegment(node.segment),
    children,
  };
}

function toItem(
  entry: NavigationEntry,
  children: readonly NavigationItem[] = [],
): NavigationItem {
  return {
    label: entry.title,
    href: entry.entry.permalink,
    ...(children.length === 0 ? {} : { children }),
  };
}

function compareNodes(a: TreeNode, b: TreeNode): number {
  const left = a.index ?? a.page;
  const right = b.index ?? b.page;
  const leftTitle = left?.title ?? titleFromSegment(a.segment);
  const rightTitle = right?.title ?? titleFromSegment(b.segment);
  const title = leftTitle.localeCompare(rightTitle, "en", {
    sensitivity: "base",
  });
  if (title !== 0) return title;
  return a.segment.localeCompare(b.segment, "en", { sensitivity: "base" });
}

function createTreeNode(segment: string): TreeNode {
  return { segment, children: new Map() };
}

function titleFromSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
}

function validateItems(
  value: unknown,
  path: string,
  issues: ConfigValidationIssue[],
  ancestors: Set<object>,
): void {
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array." });
    return;
  }

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}[${index}]`;
    if (!isRecord(item)) {
      issues.push({ path: itemPath, message: "Expected an object." });
      continue;
    }
    if (ancestors.has(item)) {
      issues.push({
        path: itemPath,
        message: "Navigation children must not be recursive.",
      });
      continue;
    }

    if (typeof item.label !== "string" || item.label.trim() === "") {
      issues.push({
        path: `${itemPath}.label`,
        message: "Expected a non-empty string.",
      });
    }
    if (typeof item.href !== "string" || item.href.trim() === "") {
      issues.push({
        path: `${itemPath}.href`,
        message: "Expected a non-empty string.",
      });
    }
    if (item.external !== undefined && typeof item.external !== "boolean") {
      issues.push({
        path: `${itemPath}.external`,
        message: "Expected a boolean.",
      });
    }
    if (item.children !== undefined) {
      const nextAncestors = new Set(ancestors);
      nextAncestors.add(item);
      validateItems(
        item.children,
        `${itemPath}.children`,
        issues,
        nextAncestors,
      );
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
