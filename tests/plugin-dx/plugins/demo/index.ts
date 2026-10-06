import {
  definePlugin,
  escapeHtml,
  escapeHtmlAttribute,
  type PluginPage,
  type PluginPageContext,
  type RiebeckitePlugin,
} from "@riebeckite/core";

export type PluginDemoOptions = {
  heading?: string;
};

export function resolvePluginDemoPage(
  context: PluginPageContext,
  options: PluginDemoOptions,
): PluginPage | null {
  if (context.pathname !== "/plugin-demo") {
    return null;
  }
  const entries = [...context.manifest.discoverableEntries].sort((a, b) =>
    a.slug.localeCompare(b.slug),
  );
  const items = entries
    .map(
      (entry) =>
        `<li data-plugin-demo-item data-plugin-demo-title="${escapeHtmlAttribute(entry.title.toLowerCase())}"><a href="${escapeHtml(entry.permalink)}">${escapeHtml(entry.title)}</a></li>`,
    )
    .join("");
  const body = [
    `<main data-plugin-demo>`,
    `<h1>${escapeHtml(options.heading ?? "Plugin demo")}</h1>`,
    `<input type="search" data-plugin-demo-filter placeholder="Filter entries" />`,
    `<ul data-plugin-demo-list>${items}</ul>`,
    `<p data-plugin-demo-count>${entries.length} entries</p>`,
    `</main>`,
  ].join("");
  return {
    type: "plugin-dx-demo",
    pathname: context.pathname,
    title: options.heading ?? "Plugin demo",
    body,
  };
}

export function pluginDemoPlugin(
  options: PluginDemoOptions = {},
): RiebeckitePlugin<PluginDemoOptions> {
  return definePlugin({
    name: "plugin-dx-demo",
    options,
    assets: [
      {
        pluginName: "plugin-dx-demo",
        kind: "style",
        moduleSpecifier: "@plugin-dx/demo/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "plugin-dx-demo",
        moduleSpecifier: "@plugin-dx/demo/client",
        exportName: "initPluginDemo",
      },
    ],
    pageTypes: [
      {
        id: "plugin-dx-demo-index",
        paths: ["/plugin-demo"],
        resolve: (context) => resolvePluginDemoPage(context, options),
      },
    ],
  });
}
