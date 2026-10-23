---
date: 2026-10-20
title: Component Generator
---
# Component Generator

`riebeckite create component` creates a typed Hono JSX component. The default target is the site:

```sh
riebeckite create component note-card --with-tests --with-styles
riebeckite create component note-card --target plugin --plugin notes --with-styles
```

The site target writes `app/components/<name>.tsx`. The Plugin target writes `extensions/<plugin>/components/<name>.tsx` and re-exports its default component and props from the Plugin root. The interactive Plugin target lists local Plugins that have an entry point, so create the Plugin first with `riebeckite create plugin`. It never inserts the component into a layout; the site author imports and places it.

The optional stylesheet uses an `rr-<name>` namespace, public `--rb-*` semantic tokens, responsive spacing, and `:focus-visible`. Import the stylesheet from the site's existing CSS entry when you choose `--with-styles`; the generator does not mutate application layout or global CSS automatically.

Themes do not own components in the public Theme API. `--target theme` intentionally stops with guidance: create a site or Plugin component and style its stable `rr-*` hook from the Theme root. This preserves the Theme boundary and light/dark token behavior.

After editing props or markup, typecheck the Site and run its tests. For Plugin components, keep all imports on public package APIs and export data helpers separately when content data is needed. See [Share a UI Component](./recipes/components.md) and [Your First Theme](../themes/writing-a-theme.md).
