# Customizing Your Site

A Riebeckite site is a normal HonoX application. You do not need to learn a
Riebeckite-specific frontend framework to change how your site looks or
behaves. Riebeckite supplies content, the manifest, and plugin wiring; the
`app/` directory is an ordinary HonoX application that you own.

This guide maps which parts belong to the site and how to use plain HonoX and
Hono JSX to change them. It is a map, not a HonoX tutorial — follow the HonoX
documentation for the framework itself.

## Where site code lives

| Directory | Site-owned responsibility |
| --- | --- |
| `app/routes/` | URL handling, page composition, redirects, and response metadata |
| `app/components/` | Reusable site presentation and composition of public UI primitives |
| `app/islands/` | Optional interactive UI and its client-side state |
| `app/style.css` and local CSS | Visual tokens, layout, typography, and generated extension styles |

Everything under `app/` is application source. The integration writes generated
files under `app/.riebeckite/`; treat those as build output, not as source.

## Components

Write ordinary Hono JSX components under `app/components/`. Nothing special is
required:

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

If you want the article structure Riebeckite documents, compose the public
`@riebeckite/honox/ui` primitives (`Article`, `ArticleLayout`, `ArticleContent`,
and so on). They are deliberately a small structural contract, not a component
framework, and you can ignore them and write your own markup. See
[UI primitives](../framework/honox-integration.md#ui-primitives).

## Layout

The article layout is site-owned. In the scaffolded starter it is
`app/components/article.tsx` (the `SiteArticle` component), and the document
shell is `app/routes/_renderer.tsx`.

`SiteArticle` is a site component, not a public Riebeckite component: it wraps
the `@riebeckite/honox/ui` `Article` primitive and decides where each body slot
is rendered. Edit it freely to change the article structure, add your own
headings, or move a plugin fragment. The `Article` you see in a route example
is this site component, not the primitive with the same name.

`app/routes/_renderer.tsx` is the shell. It owns the document `<head>`,
navigation, and page chrome, and it renders the head tags and generated styles
the integration provides. See
[Head tag handoff](../framework/honox-integration.md#head-tag-handoff).

## Routes

`app/routes/` is a normal HonoX route directory. Add, remove, or reshape routes
as you would in any HonoX application — for example an `/about` page. Content
and plugin pages go through the scaffolded catch-all route, which uses
`resolveRiebeckiteRoute`, `contentRouteSsgParams`, and `pluginPageSsgParams`
from `@riebeckite/honox`. Because those already resolve content and plugin Page
Types, you never add a route just to show a plugin page.

## Plugin Components

Many plugins export Hono JSX components so you can place their UI exactly where
you want. Import the component from the plugin package and render it in your own
tree:

```tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside({ items, backlinks }: Props) {
  return (
    <aside>
      <TableOfContents items={items} />
      <Backlinks backlinks={backlinks} />
    </aside>
  );
}
```

Each component is also the default export of the package's `./components`
subpath, so `import Backlinks from "@riebeckite/plugin-backlinks/components"`
works as well. `color-mode` is the exception: it exports `ColorModeScript` and
`ColorModeToggle` from the package root only. Check the plugin page and the
package README for the component name, props, and any data helpers.

Some plugins publish an HTML fragment into a body slot instead of, or in
addition to, a component. Those appear automatically once the plugin is
enabled and the site renders the slot. See
[Body slots](../reference/plugin-api.md#body-slots) and, for the author's
view, [Providing UI or output](../plugins/writing-a-plugin.md#providing-ui-or-output).

## Islands

When you need state or interaction, use a normal HonoX island under
`app/islands/` and import it from the route or component that owns it. Hydration
and client state stay local to the site. `app/client.ts` must initialize both
`createClient()` and `initRiebeckiteClient()`; the latter starts browser entries
contributed by installed plugins and themes. Plugins do not own `app/islands/`,
and there is no plugin island registry.

## Styling

Use CSS or Tailwind as usual in `app/style.css` and local CSS. Import the
generated extension styles once:

```css
/* app/style.css */
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

Do not edit generated files under `app/.riebeckite/`. Style plugin output
through its documented `rr-<feature>` root hook, and the `rb-*` structural hooks
for the UI primitives. See
[CSS hooks](../reference/plugin-api.md#css-hooks).

## Where to look next

- [HonoX Integration](../framework/honox-integration.md) — the site application contract and UI primitives
- [Plugins in Depth](../framework/plugin-system.md) — extension points for plugin authors
- [Plugin API](../reference/plugin-api.md) — exact contracts for body slots, pages, assets, and CSS hooks
