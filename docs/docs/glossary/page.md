---
date: 2026-10-14
title: Page
sidebar:
  hidden: true
---

# Page

A routable piece of content that the site serves at a URL. A page is produced either from Markdown or by a plugin page type, and the integration renders it through a route.

## Markdown pages and plugin pages

Most pages come from Markdown. A [page type](./page-type.md) lets a plugin contribute a page that is not ordinary Markdown, such as an index or a generated listing.

## Rendering details

The integration resolves a route for the page through `getPagePaths` and `getPageRoutes` (`packages/core/src/plugin/plugin_runtime.ts`), and the application assembles the final HTML. The plugin supplies the body HTML, not the site shell.

For plugin page types, the `PluginPageType` (`packages/core/src/types/plugin_page.ts`) provides a `resolve` method that takes a `PluginPageContext` and returns a `PluginPage` with `pathname` and `body`. The integration then renders this through the site's document frame.

Example plugin page type declaration in a plugin:

```ts
export default definePlugin({
  name: "my-plugin",
  pageTypes: [
    {
      id: "my-page-type",
      paths: ["my-page"],
      resolve: async (context) => ({
        type: "my-plugin",
        pathname: "/my-page",
        body: "<p>Hello from plugin</p>",
      }),
    },
  ],
});
```

Example rendered page in the application:

```tsx
<Page route={page.route} data={page.data} body={page.body} />
```
