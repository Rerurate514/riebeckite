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

| Plugin | Fixtures | Preview options |
| --- | --- | --- |
| Code Tabs | Basic tabs, separate groups | `syncTabs` |
| Code Annotations | Diff | None |

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
duplicate ids, unknown option fields, and values with the wrong type.

## Security and limits

The public endpoint accepts only registered plugin ids, their own fixture ids,
and schema-valid options. It processes up to 100 KiB of Markdown and 10 KiB of
serialized options per request. The rendered HTML is sanitized after the real
pipeline runs, then displayed in an iframe with an empty sandbox and a
restrictive CSP.

Plugin client entries do not run inside previews. This prevents a preview from
running arbitrary scripts, accessing the parent page, or making arbitrary
network requests. Plugins requiring site manifests, page context, external
services, or a client lifecycle are not available until they have a suitable
preview descriptor and isolation model.
