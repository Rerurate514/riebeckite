---
title: Plugin Previews
---
# Plugin Previews

Use the [Playground](/playground) to try supported Markdown plugins with the
same Riebeckite pipeline that renders a site. Choose a fixture, edit Markdown,
adjust the plugin options exposed by the preview, and select a theme and color
mode for the result.

[日本語](./plugin-previews.ja.md)

## Supported plugins

| Plugin | Fixture | Preview options | Pipeline result |
| --- | --- | --- |
| Auto Card Link | Link card | None | Markdown transform; static card |
| Code Annotations | Diff annotations | None | HTML transform |
| Code Enhance | Highlighted lines | `copyLabel` | HTML transform; controls are inert |
| Code Tabs | Basic tabs, separate groups | `syncTabs` | HTML transform; initial tab state only |
| Hard Breaks | Soft line breaks | None | Markdown transform |
| Highlight | Marked text | `tag` | Markdown transform |
| Lightbox | Enhanced image | None | HTML transform; image link only |
| Obsidian Markdown | Callout and tag | None | Markdown transform |
| Sidenotes | Footnote conversion | Plugin defaults | HTML transform; popover is inert |
| Shortcodes | Note shortcode | Plugin defaults | Markdown transform |

Only plugins registered by the host are available. A preview descriptor records
its id, title, browser availability, fixtures, option schema, and the real
plugin factory. The Playground and documentation embeds use this same registry.

## Define a preview

Define fixtures and options beside the host's plugin registration. Values are
limited to booleans, strings, numbers, and enums so the UI can render them and
the server can validate them before constructing the plugin.

```ts
registry.register({
  id: "example",
  title: "Example",
  availability: "browser",
  fixtures: [{ id: "basic", title: "Basic", markdown: "# Example" }],
  options: {
    enabled: { type: "boolean", title: "Enabled", default: true },
  },
  create: (options) => examplePlugin(options),
});
```

Use a unique plugin id and fixture ids. The registry rejects invalid schemas,
duplicate ids, unknown fixtures and option fields, and values with the wrong
type.

## Compatibility inventory

Every package under `packages/plugins` is classified below. A plugin is shown in
the Playground only when its real pipeline output remains meaningful after
sanitization and without executing a client entry. The supported table above
records the fixture and exposed options; its styles are loaded into the isolated
document.

| Classification | Packages | Runtime boundary |
| --- | --- | --- |
| Registered static preview | `autocardlink`, `code-annotations`, `code-enhance`, `code-tabs`, `hard-breaks`, `highlight`, `lightbox`, `obsidian-markdown`, `sidenotes`, `shortcodes` | Markdown or HTML pipeline; no build context, file access, or network request is made by the renderer. |
| Not faithful in the sandbox | `chartjs`, `d2`, `discord-embed`, `graphviz`, `map`, `markmap`, `marp`, `media`, `mermaid`, `mermaid-pele`, `pdf`, `plantuml`, `qr-code`, `responsive-image`, `rich-embed`, `vega-lite`, `wavedrom` | Requires a client lifecycle, canvas/SVG/iframe output, attachment resolution, manifest pass, or external network resource that the preview intentionally does not permit. |
| Site or build context required | `alias`, `analytics`, `archive`, `attachment`, `backlinks`, `bases`, `breadcrumbs`, `canvas`, `changelog`, `citations`, `color-mode`, `daily-notes`, `dataview`, `deploy`, `diagnostics`, `diff`, `docs`, `excalibrain`, `excalidraw`, `flashcards`, `folder-pages`, `gallery`, `garden-explorer`, `hover-preview`, `kanban`, `l10n`, `local-graph`, `navigation`, `permalink`, `properties`, `quality`, `query`, `recent-posts`, `related-posts`, `rename`, `search`, `seo`, `series`, `share`, `taxonomy`, `text-fragment`, `toc`, `ux`, `webmention` | Needs a site manifest, content graph, filesystem, routing, deployment state, search index, or host client integration. |

The non-registered packages are deliberately unsupported rather than simulated.
In particular, Mermaid, Chart.js, Dataview, Bases, Canvas, Search, and graph
plugins need capabilities that would make this public preview unfaithful or
weaken its isolation.

## Security and limits

The public endpoint accepts only registered plugin ids, their own fixture ids,
and schema-valid options. It processes up to 100 KiB of Markdown and 10 KiB of
serialized options per request. The rendered HTML is sanitized after the real
pipeline runs, then displayed in an iframe with an empty sandbox and a
restrictive CSP.

Plugin client entries do not run inside previews. This prevents a preview from
running arbitrary scripts, accessing the parent page, or making arbitrary
network requests. Preview controls rerender the server-side result; controls
inside rendered plugin output stay inert. Plugins requiring site manifests,
page context, external services, or a client lifecycle are not available until
they have a suitable preview descriptor and isolation model.
