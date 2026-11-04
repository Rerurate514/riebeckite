---
date: 2026-10-06
title: Plugins and CSS
sidebar:
  label: Plugins and CSS
  order: 30
---
# Plugins and CSS

## Using plugin components

Some plugins provide Hono JSX components you can use directly from the site. For
example, you can place Backlinks or a Table of Contents anywhere you like:

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

Check each plugin page or package README for the available components and props.
Many components can also be imported as the default export from `./components`:

```tsx
import Backlinks from "@riebeckite/plugin-backlinks/components";
```

`color-mode` is the exception: it exports `ColorModeScript` and
`ColorModeToggle` from the package root.

### Context-aware components

Some plugin components resolve the current page data themselves. Inside
`SiteProvider` and an `Article` carrying its public `entry`, they read from
context, so the Site can render them without passing data explicitly. Explicit
props always override the context.

See [UI components](../../reference/plugin-api/ui-and-assets.md#ui-components) and
[Providing UI or output](../../plugins/writing-a-plugin.md#providing-ui-or-output).

## Building interactive UI

Create UI that needs browser behavior, such as clicks or state, as a normal
HonoX island under `app/islands/`. Import the island from a route or component
as usual. There is no Riebeckite-specific island mechanism.

`app/client.ts` initializes both:

```ts
createClient();
initRiebeckiteClient();
```

`createClient()` initializes the site's client behavior, and
`initRiebeckiteClient()` starts the browser-side behavior that plugins and
themes provide. Site islands live under `app/islands/`, while plugin browser
behavior lives in the plugin, keeping the responsibilities separate.

## Changing CSS

You can change the site design from `app/style.css` and each component's CSS.
Generated presets keep the site styles in `app/styles/`; `app/style.css` only
imports them. Plain CSS and Tailwind both work.

Import the CSS Riebeckite generates from plugins and themes once from the site
CSS:

```css
/* app/style.css */
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

Do not edit files under `app/.riebeckite/`; they are generated. To override
plugin appearance use the plugin's documented root hook (usually `rr-<feature>`; some built-in plugins use `rb-*`), and to adjust the Riebeckite
UI primitives use the `rb-*` structural hooks. See
[CSS hooks](../../reference/plugin-api/ui-and-assets.md#css-hooks).
