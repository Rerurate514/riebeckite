/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { defineHastTransform, type PluginHastNode } from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";
import rehypeStringify from "rehype-stringify";
import { unified } from "unified";
import { CodeTabsGroup } from "./tabs.js";

const serializer = unified().use(rehypeStringify);

export const codeTabsTransform = defineHastTransform({
  name: "CodeTabs",
  match(node) {
    return (
      node.type === "element" &&
      node.tagName === "div" &&
      hasClass(node, "rr-code-tabs")
    );
  },
  render({ node, html }) {
    const groupId = getString(node, "data-code-tabs-id");
    const tablist = childElements(node).find(
      (child) => getString(child, "role") === "tablist",
    );
    const panels = childElements(node).filter(
      (child) => getString(child, "role") === "tabpanel",
    );
    if (!groupId || !tablist || panels.length === 0) return html;

    const buttons = childElements(tablist);
    const tabs = panels.map((panel, index) => ({
      label:
        getString(buttons[index] ?? panel, "data-code-tabs-label") ??
        getString(panel, "data-code-tabs-label") ??
        `Tab ${index + 1}`,
      html: serializer.stringify({
        type: "root",
        children: panel.children ?? [],
      } as never),
    }));

    return renderToString(
      <CodeTabsGroup
        groupId={groupId}
        sync={getString(node, "data-code-tabs-sync") === "true"}
        tabs={tabs}
      />,
    );
  },
});

function childElements(node: PluginHastNode): PluginHastNode[] {
  return (node.children ?? []).filter((child) => child.type === "element");
}

function hasClass(node: PluginHastNode, name: string): boolean {
  const value = node.properties?.className;
  if (Array.isArray(value)) return value.includes(name);
  return typeof value === "string" && value.split(/\s+/).includes(name);
}

function getString(node: PluginHastNode, key: string): string | null {
  const properties = node.properties ?? {};
  const value =
    properties[key] ??
    properties[key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`)];
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(" ");
  return null;
}
