# Page System

The Page System lets a plugin provide a standalone page without taking over an
application route. It is a capability on the normal `RiebeckitePlugin`
contract, not a second kind of plugin.

## Responsibilities

| Layer | Responsibility |
| --- | --- |
| Core | Page Type contract, validation, path enumeration, resolution, and conflicts |
| Plugin | Page Type ID, public paths, and a framework-independent HTML body |
| HonoX integration | Generic route resolver and SSG parameter helper |
| Site application | Catch-all route, document frame, metadata, and safe HTML rendering |
| Theme | Tokens and stable hooks; no knowledge of a Page Type ID is required |

`PluginPageContext.manifest` is the resolved manifest. Its `entries` still
contains `draft` and `scheduled`, so a Page Type must read `publicEntries`
(routable) or `discoverableEntries` (public only) for page output instead.

## Rendering pipeline

Before Page Types, a standalone plugin feature needed a dedicated route:

```text
request -> plugin-specific application route -> plugin component -> document frame
```

With the Page System, plugins participate through one generic route:

```text
build: plugin Page Types -> public paths -> SSG parameters
request: catch-all route -> resolveRiebeckiteRoute
                           -> plugin page | content | redirect
plugin page -> site document frame -> theme CSS and plugin client entries
```

The route and frame remain site-owned. Plugins return a body fragment and
optional `title`, `description`, `headTags`, and `language`; the site decides how
those values are represented in the document.

## Authoring a Page Type

Use `pageTypes` when the feature is an independent screen. Use `renderers` for
content embeds such as Canvas, Bases, and Excalidraw: they belong inside an
article and do not need a page of their own.

```ts
import { definePlugin } from "@riebeckite/core";

export function reportPlugin() {
  return definePlugin({
    name: "report",
    pageTypes: [{
      id: "example.report",
      paths: ["/report"],
      resolve: ({ pathname, manifest }) => pathname === "/report"
        ? {
            type: "example.report",
            pathname,
            title: "Report",
            body: `<p>${manifest.publicEntries.length} published entries</p>`,
          }
        : null,
    }],
  });
}
```

IDs are globally unique. A request with multiple matching Page Types selects
the greatest `priority`; equal priorities are an explicit error. Declare
`paths` for every static page and derive dynamic paths from
`manifest.publicEntries` when SSG must emit them.

## HonoX application wiring

Every HonoX site that uses plugin pages needs the generic catch-all route. The
scaffolded site already includes it:

```tsx
import {
  pluginPageSsgParams,
  resolveRiebeckiteRoute,
} from "@riebeckite/honox/server";

export const ssgParams = async () => [
  ...(await contentRouteSsgParams(content)),
  ...(await pluginPageSsgParams(content)),
];

const route = await resolveRiebeckiteRoute(content, c.req.path);
if (route?.kind === "page") {
  c.set("headTags", route.page.headTags ?? []);
  return c.render(<div dangerouslySetInnerHTML={{ __html: route.page.body }} />);
}
```

Keep the frame's HTML policy at the application boundary. A plugin must only
return HTML it is responsible for generating; an application must not treat
untrusted request input as a page body.

For the complete fields and runtime validation rules, see the
[Plugin API](../reference/plugin-api.en.md#pages).
