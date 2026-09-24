import {
  element,
  getBooleanProperty,
  getStringProperty,
  isElementNode,
  mergeClassName,
  text,
} from "./hast.js";
import type { CodeTabsOptions, ElementNode, HastNode } from "./types.js";

type TabBlock = {
  node: ElementNode;
  label: string;
};

export function rehypeCodeTabs(options: CodeTabsOptions = {}) {
  let groupIndex = 0;
  return (tree: HastNode) => {
    transformChildren(tree, options, () => {
      groupIndex += 1;
      return `rr-code-tabs-${groupIndex}`;
    });
  };
}

function transformChildren(
  node: HastNode,
  options: CodeTabsOptions,
  nextGroupId: () => string,
) {
  if (!hasChildren(node)) return;

  for (const child of node.children)
    transformChildren(child, options, nextGroupId);

  const nextChildren: HastNode[] = [];
  let group: TabBlock[] = [];

  const flushGroup = () => {
    if (group.length === 0) return;
    nextChildren.push(buildTabGroup(group, options, nextGroupId()));
    group = [];
  };

  for (const child of node.children) {
    const tabBlock = isElementNode(child) ? getTabBlock(child) : null;
    if (tabBlock) {
      group.push(tabBlock);
      continue;
    }

    flushGroup();
    nextChildren.push(child);
  }

  flushGroup();
  node.children = nextChildren;
}

function buildTabGroup(
  group: TabBlock[],
  options: CodeTabsOptions,
  groupId: string,
): ElementNode {
  return element(
    "div",
    {
      className: "rr-code-tabs",
      dataCodeTabs: "true",
      dataCodeTabsSync: options.syncTabs ? "true" : undefined,
    },
    [
      element(
        "div",
        { className: "rr-code-tabs__tablist", role: "tablist" },
        group.map((tab, index) =>
          element(
            "button",
            {
              type: "button",
              className: "rr-code-tabs__tab",
              role: "tab",
              id: `${groupId}-tab-${index}`,
              ariaControls: `${groupId}-panel-${index}`,
              ariaSelected: index === 0 ? "true" : "false",
              tabindex: index === 0 ? "0" : "-1",
              dataCodeTabsTab: "true",
              dataCodeTabsLabel: tab.label,
            },
            [text(tab.label)],
          ),
        ),
      ),
      ...group.map((tab, index) =>
        element(
          "div",
          {
            className: "rr-code-tabs__panel",
            role: "tabpanel",
            id: `${groupId}-panel-${index}`,
            ariaLabelledBy: `${groupId}-tab-${index}`,
            dataCodeTabsPanel: "true",
            dataCodeTabsLabel: tab.label,
            dataActive: index === 0 ? "true" : "false",
          },
          [tab.node],
        ),
      ),
    ],
  );
}

function getTabBlock(node: ElementNode): TabBlock | null {
  if (!isCodeBlockRoot(node)) return null;

  const metaOwner = findMetaOwner(node);
  if (!metaOwner) return null;

  const meta = getCodeMeta(metaOwner);
  const label = meta ? parseTabLabel(meta) : null;
  if (!label) return null;

  removeTabMeta(metaOwner, meta);
  node.properties = {
    ...node.properties,
    className: mergeClassName(node.properties?.className, "rr-code-tabs__code"),
  };

  return { node, label };
}

function isCodeBlockRoot(node: ElementNode): boolean {
  if (node.tagName === "pre") return Boolean(findDirectChild(node, "code"));
  return (
    node.tagName === "figure" &&
    getBooleanProperty(node, "dataRehypePrettyCodeFigure")
  );
}

function findMetaOwner(node: ElementNode): ElementNode | null {
  if (node.tagName === "pre") return findDirectChild(node, "code") ?? node;
  const pre = findDirectChild(node, "pre");
  if (!pre) return node;
  return findDirectChild(pre, "code") ?? pre;
}

function getCodeMeta(node: ElementNode): string | null {
  return (
    getStringProperty(node, "meta") ??
    getStringProperty(node, "dataMeta") ??
    getStringProperty(node, "data-meta") ??
    getStringProperty(node, "metastring")
  );
}

function parseTabLabel(meta: string): string | null {
  const match = meta.match(/(?:^|\s)tab=("([^"]*)"|'([^']*)'|([^\s]+))/);
  const label = match?.[2] ?? match?.[3] ?? match?.[4] ?? null;
  const trimmed = label?.trim();
  return trimmed ? trimmed : null;
}

function removeTabMeta(node: ElementNode, meta: string) {
  const nextMeta = meta
    .replace(/(?:^|\s)tab=("[^"]*"|'[^']*'|[^\s]+)/, "")
    .trim();
  node.properties = { ...node.properties };
  for (const key of ["meta", "dataMeta", "data-meta", "metastring"]) {
    if (node.properties[key] === meta) {
      if (nextMeta) node.properties[key] = nextMeta;
      else delete node.properties[key];
    }
  }
}

function findDirectChild(
  node: ElementNode,
  tagName: string,
): ElementNode | null {
  return (
    node.children?.find(
      (child): child is ElementNode =>
        child.type === "element" && child.tagName === tagName,
    ) ?? null
  );
}

function hasChildren(
  node: HastNode,
): node is HastNode & { children: HastNode[] } {
  return Array.isArray((node as { children?: unknown }).children);
}
