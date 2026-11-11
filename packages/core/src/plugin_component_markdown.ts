import type { Node } from "unist";
import { parse } from "yaml";
import { preparePluginComponent } from "./plugin_component_render.js";
import type { JsonValue } from "./types/json_value.js";
import type { PluginMarkdownComponent } from "./types/plugin_component.js";

type MarkdownNode = Node & {
  type: string;
  lang?: string | null;
  meta?: string | null;
  value?: string;
  children?: MarkdownNode[];
};

export function renderPluginComponents(
  components: readonly PluginMarkdownComponent[],
) {
  const registry = new Map(
    components.map((component) => [component.name, component]),
  );
  return async (tree: Node) => {
    await replaceComponents(tree as MarkdownNode, registry);
  };
}

async function replaceComponents(
  node: MarkdownNode,
  registry: ReadonlyMap<string, PluginMarkdownComponent>,
): Promise<void> {
  if (!node.children) return;
  for (const [index, child] of node.children.entries()) {
    if (child.type === "code" && child.lang === "riebeckite-component") {
      node.children[index] = await renderComponent(child, registry);
      continue;
    }
    await replaceComponents(child, registry);
  }
}

async function renderComponent(
  node: MarkdownNode,
  registry: ReadonlyMap<string, PluginMarkdownComponent>,
): Promise<MarkdownNode> {
  const name = node.meta?.trim();
  if (!name || /\s/.test(name)) {
    throw new Error(
      "A riebeckite-component fence needs exactly one component name.",
    );
  }
  const component = registry.get(name);
  if (!component) throw new Error(`Unknown plugin component: ${name}`);
  const props = parseProps(node.value ?? "", name);
  const prepared = await preparePluginComponent(component, props);
  const attributes = [
    `data-riebeckite-component="${escapeHtml(prepared.name)}"`,
    `data-riebeckite-component-props="${escapeHtml(prepared.props)}"`,
  ];
  if (prepared.interactive)
    attributes.push('data-riebeckite-component-interactive="true"');
  return {
    type: "html",
    value: `<div ${attributes.join(" ")}>${prepared.content}</div>`,
  };
}

function parseProps(source: string, name: string): Record<string, JsonValue> {
  let value: unknown;
  try {
    value = source.trim() ? parse(source) : {};
  } catch (error) {
    throw new Error(
      `Invalid props for plugin component "${name}": ${String(error)}`,
    );
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Plugin component "${name}" props must be a YAML mapping.`);
  }
  return value as Record<string, JsonValue>;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}
