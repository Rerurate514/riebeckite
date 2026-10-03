import type { ContentManifestEntry } from "@riebeckite/core";
import type {
  DocsNavigationEntry,
  DocsNavigationItem,
  DocsNavigationLink,
  DocsOptions,
  DocsSidebarFrontmatter,
  ResolvedDocsOptions,
} from "./types.js";

type TreeNode = {
  readonly segment: string;
  index?: DocsNavigationEntry;
  page?: DocsNavigationEntry;
  readonly children: Map<string, TreeNode>;
};

const ROOT_SEGMENT = "";

export function resolveDocsOptions(options: DocsOptions): ResolvedDocsOptions {
  return {
    root: normalizeRoot(options.root),
    sidebar: {
      auto: options.sidebar?.auto ?? true,
      label: options.sidebar?.label ?? "Docs navigation",
    },
    prevNext: options.prevNext ?? true,
  };
}

export function buildDocsNavigation(
  entries: readonly ContentManifestEntry[],
  options: ResolvedDocsOptions,
): readonly DocsNavigationItem[] {
  if (!options.sidebar.auto) return [];
  const docsEntries = entries
    .map((entry) => toNavigationEntry(entry, options.root))
    .filter((entry): entry is DocsNavigationEntry => Boolean(entry))
    .filter((entry) => !entry.hidden);
  const root = createTreeNode(ROOT_SEGMENT);
  for (const entry of docsEntries) addEntry(root, entry);
  const rootIndex = root.index;
  const items = buildItems(root, []);
  if (!rootIndex) return items;
  return [toItem(rootIndex, []), ...items];
}

export function flattenDocsNavigation(
  items: readonly DocsNavigationItem[],
): readonly DocsNavigationLink[] {
  return items.flatMap((item) => {
    const current =
      item.href && item.slug
        ? [{ title: item.title, href: item.href, slug: item.slug }]
        : [];
    return [...current, ...flattenDocsNavigation(item.children)];
  });
}

function normalizeRoot(root: string): string {
  return root.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

function toNavigationEntry(
  entry: ContentManifestEntry,
  root: string,
): DocsNavigationEntry | null {
  const relativePath = resolveRelativeDocsPath(entry, root);
  if (!relativePath) return null;
  const segments = relativePath.split("/").filter(Boolean);
  const isIndex = ["index", "README"].includes(segments.at(-1) ?? "");
  const sidebar = readSidebarFrontmatter(entry.frontmatter.sidebar);
  return {
    entry,
    relativePath,
    segments,
    isIndex,
    title: resolveTitle(entry, sidebar),
    order: sidebar.order,
    hidden: sidebar.hidden ?? false,
    collapsed: sidebar.collapsed,
  };
}

function resolveRelativeDocsPath(
  entry: ContentManifestEntry,
  root: string,
): string | null {
  if (entry.slug === root) return "index";
  if (entry.slug.startsWith(`${root}/`))
    return entry.slug.slice(root.length + 1);

  const language = entry.publicLocation.metadata?.["l10n.lang"];
  if (!language) return null;
  const localizedRoot = `${language}/${root}`;
  if (entry.slug === localizedRoot) return "index";
  if (entry.slug.startsWith(`${localizedRoot}/`)) {
    return entry.slug.slice(localizedRoot.length + 1);
  }
  return null;
}

function readSidebarFrontmatter(value: unknown): DocsSidebarFrontmatter {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  return {
    ...(typeof record.label === "string" && record.label.trim()
      ? { label: record.label.trim() }
      : {}),
    ...(typeof record.order === "number" && Number.isFinite(record.order)
      ? { order: record.order }
      : {}),
    ...(typeof record.hidden === "boolean" ? { hidden: record.hidden } : {}),
    ...(typeof record.collapsed === "boolean"
      ? { collapsed: record.collapsed }
      : {}),
  };
}

function resolveTitle(
  entry: ContentManifestEntry,
  sidebar: DocsSidebarFrontmatter,
): string {
  if (sidebar.label) return sidebar.label;
  if (entry.title.trim()) return entry.title.trim();
  return titleFromSegment(entry.slug.split("/").at(-1) ?? entry.slug);
}

function addEntry(root: TreeNode, entry: DocsNavigationEntry): void {
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

function buildItems(
  node: TreeNode,
  path: readonly string[],
): readonly DocsNavigationItem[] {
  return [...node.children.values()]
    .toSorted(compareNodes)
    .map((child) => nodeToItem(child, [...path, child.segment]));
}

function nodeToItem(
  node: TreeNode,
  path: readonly string[],
): DocsNavigationItem {
  const primary = node.index ?? node.page;
  const children = [
    ...(node.index && node.page ? [toItem(node.page, [])] : []),
    ...buildItems(node, path),
  ];
  if (primary) return toItem(primary, children);
  return {
    title: titleFromSegment(node.segment),
    children,
  };
}

function toItem(
  entry: DocsNavigationEntry,
  children: readonly DocsNavigationItem[],
): DocsNavigationItem {
  return {
    title: entry.title,
    href: entry.entry.permalink,
    slug: entry.entry.slug,
    ...(entry.order === undefined ? {} : { order: entry.order }),
    ...(entry.collapsed === undefined ? {} : { collapsed: entry.collapsed }),
    children,
  };
}

function compareNodes(a: TreeNode, b: TreeNode): number {
  const left = a.index ?? a.page;
  const right = b.index ?? b.page;
  return compareNavigationKeys(
    left?.order,
    left?.title ?? titleFromSegment(a.segment),
    a.segment,
    right?.order,
    right?.title ?? titleFromSegment(b.segment),
    b.segment,
  );
}

function compareNavigationKeys(
  leftOrder: number | undefined,
  leftTitle: string,
  leftPath: string,
  rightOrder: number | undefined,
  rightTitle: string,
  rightPath: string,
): number {
  if (leftOrder !== undefined || rightOrder !== undefined) {
    if (leftOrder === undefined) return 1;
    if (rightOrder === undefined) return -1;
    const order = leftOrder - rightOrder;
    if (order !== 0) return order;
  }
  const title = leftTitle.localeCompare(rightTitle, "en", {
    sensitivity: "base",
  });
  if (title !== 0) return title;
  return leftPath.localeCompare(rightPath, "en", { sensitivity: "base" });
}

function createTreeNode(segment: string): TreeNode {
  return { segment, children: new Map() };
}

function titleFromSegment(segment: string): string {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
}
