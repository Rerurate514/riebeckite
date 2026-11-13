import { resolveContentAssetUrl } from "./content/markdown_image.js";
import { prepareMarkdownComponent } from "./plugin_component_render.js";
import type { ContentManifest } from "./types/content_manifest.js";
import type { JsonValue } from "./types/json_value.js";
import type {
  PluginMarkdownComponent,
  PluginMarkdownComponentResolveContext,
} from "./types/plugin_component.js";

const DEFERRED_PATTERN =
  /<div data-riebeckite-component="([^"]+)" data-riebeckite-component-props="([^"]+)" data-riebeckite-component-deferred="true"><\/div>/g;

export async function finalizeDeferredMarkdownComponents(
  manifest: ContentManifest,
  markdownComponents: readonly PluginMarkdownComponent[],
  diagnostics: NonNullable<
    PluginMarkdownComponentResolveContext["diagnostics"]
  > = [],
): Promise<void> {
  const registry = new Map(
    markdownComponents
      .filter((component) => component.deferUntilManifest)
      .map((component) => [component.name, component]),
  );
  if (registry.size === 0) return;

  for (const entry of manifest.entries) {
    if (!entry.html.includes("data-riebeckite-component-deferred")) continue;
    let html = "";
    let lastIndex = 0;
    for (const match of entry.html.matchAll(DEFERRED_PATTERN)) {
      const index = match.index ?? 0;
      html += entry.html.slice(lastIndex, index);
      html += await renderDeferred(
        match[1] ?? "",
        match[2] ?? "",
        entry.slug,
        manifest,
        registry,
        diagnostics,
      );
      lastIndex = index + match[0].length;
    }
    entry.html = html + entry.html.slice(lastIndex);
  }
}

async function renderDeferred(
  name: string,
  encodedProps: string,
  slug: string,
  manifest: ContentManifest,
  registry: ReadonlyMap<string, PluginMarkdownComponent>,
  diagnostics: NonNullable<
    PluginMarkdownComponentResolveContext["diagnostics"]
  >,
): Promise<string> {
  const component = registry.get(name);
  if (!component) return "";

  const rawProps = JSON.parse(
    Buffer.from(encodedProps, "base64").toString("utf8"),
  ) as Record<string, JsonValue>;
  const context: PluginMarkdownComponentResolveContext = {
    sourceSlug: slug,
    manifest,
    diagnostics,
    resolveAssetUrl: (input) => resolveContentAssetUrl(input, slug),
  };

  try {
    const prepared = await prepareMarkdownComponent(
      component,
      rawProps,
      context,
    );
    const attributes = [
      `data-riebeckite-component="${escapeHtml(prepared.name)}"`,
      `data-riebeckite-component-props="${escapeHtml(prepared.props)}"`,
    ];
    if (prepared.interactive)
      attributes.push('data-riebeckite-component-interactive="true"');
    return `<div ${attributes.join(" ")}>${prepared.content}</div>`;
  } catch (error) {
    const content = component.renderError
      ? await component.renderError(error, rawProps)
      : `<div role="status">${escapeHtml(formatError(error))}</div>`;
    return `<div data-riebeckite-component="${escapeHtml(component.name)}" data-riebeckite-component-props="${escapeHtml(encodedProps)}">${content}</div>`;
  }
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

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
