# @riebeckite/plugin-navigation

<!-- Generated from docs/docs/plugins/navigation.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Site navigation as a Riebeckite plugin. `navigation()` derives the primary
navigation from the notes already in the vault, so an existing Obsidian vault
becomes navigable with no Riebeckite-specific file and no required frontmatter.
The plugin owns the navigation *model*, rendered UI, and interaction styling;
the Site owns placement — where each rendered navigation appears.

[日本語](./README_ja.md)

## Live example

The header links — Docs, Plugins, Themes, and GitHub — are generated from the `navigation()` configuration. The Documentation sidebar is the Docs collection navigation.

## Overview

`navigation()` reads the manifest's discoverable entries — the notes that are
published and routable — and groups them by their slug hierarchy:

- a folder becomes a section;
- an `index` or `README` note links its folder, and the folder's first-level
  note becomes its child;
- every other note becomes a link;
- titles come from the note's own `title`, falling back to the slug segment.

A folder with no index note still renders as a label grouped around its
children. Drafts, scheduled and otherwise non-discoverable notes never appear,
because the model is built from `manifest.discoverableEntries`.

Nothing in the vault has to change: no `navigation.md`, no navigation
frontmatter, no re-declaring what the folder structure already says.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { navigation } from "@riebeckite/plugin-navigation";

export default defineConfig({
  // ...
  plugins: [navigation()],
});
```

The Site shell renders the model. In a HonoX site:

```tsx
import { content } from "../content";
import { resolveSiteNavigation } from "@riebeckite/plugin-navigation";

const model = resolveSiteNavigation(config, await content.getManifest());
const primary = model?.primary ?? [];
const secondary = model?.secondary ?? [];
```

`resolveSiteNavigation` returns `null` when the plugin is not registered, so a
site without navigation keeps working.

### Rendering

`SiteNav` renders a resolved tree as a `<nav>` landmark with nested lists.
`MobileSiteNav` renders its compact `<details>` menu. The plugin owns both
components' `rb-nav` UI — list flow, links, nested menus, focus treatment, and
the mobile panel — in its own `style.css`, loaded through the generated plugin
styles. The Site places the component roots in its own layout wrappers; it must
not style `rb-nav` descendants or construct the mobile menu markup:

```tsx
import { MobileSiteNav, SiteNav } from "@riebeckite/plugin-navigation";

<header class="site-header rb-site-header">
  <a href="/" class="site-header__home rb-site-header__home">My Site</a>
  <div class="site-header__primary-navigation">
    <SiteNav
      items={primary}
      path={c.req.path}
      language={c.get("htmlLanguage")}
    />
  </div>
  <div class="site-header__mobile-navigation">
    <MobileSiteNav
      items={primary}
      path={c.req.path}
      language={c.get("htmlLanguage")}
    />
  </div>
</header>;
```

`path` is the current request path. `language` is the current content language;
when set, `SiteNav` strips a matching `/language` prefix before resolving the
active item, so unlocalized authored hrefs still match localized pages. Pass
`localizeHref` to rewrite hrefs for the current language, `label` to change the
landmark label, and `class`/`className` to extend the `<nav>` classes.

For an intentional root-level visual override, set these public custom
properties on the `SiteNav` root or a wrapper: `--rb-nav-gap`,
`--rb-nav-list-flex-wrap`, `--rb-nav-list-justify-content`,
`--rb-nav-item-display`, `--rb-nav-item-padding`,
`--rb-nav-item-font-family`, `--rb-nav-item-font-size`,
`--rb-nav-item-font-weight`, `--rb-nav-item-letter-spacing`, and
`--rb-nav-item-text-transform`. Do not select `rb-nav` descendants.

## Authored navigation

Automated derivation cannot express everything, and some sites curate their
links deliberately. Pass `items` to replace derivation with authored links:

```ts
navigation({
  items: [
    { label: "Docs", href: "/docs/" },
    { label: "Reference", href: "/docs/reference/" },
    {
      label: "Themes",
      href: "/docs/themes/",
      children: [
        { label: "Default", href: "/docs/themes/default" },
        { label: "Writing a theme", href: "/docs/themes/writing-a-theme" },
      ],
    },
  ],
});
```

`secondary` holds supplementary links a Site may render less prominently:

```ts
navigation({
  secondary: [
    { label: "Docs", href: "/docs/" },
    { label: "GitHub", href: "https://github.com/Rerurate514/riebeckite", external: true },
  ],
});
```

`primary` and `secondary` describe prominence, not placement. Where each list
is rendered — a header, a footer, a sidebar — is the Site's decision.

## Sidebar navigation

Use `SidebarNavigation` for a deep documentation tree, not for the compact global links rendered by `SiteNav`.

```tsx
<SidebarNavigation items={items} searchable collapsible autoExpandActive />
```

It accepts the same `NavigationItem` tree. A parent with both `href` and children renders a separate link and disclosure button. The current page uses `aria-current="page"`; active ancestors are expanded without being marked current. Filtering keeps matching items and ancestors visible, then restores disclosure state when cleared. Interactive behavior is registered only with `navigation()`; server output remains readable without JavaScript.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `items` | `NavigationItem[]` | derived | Authored primary navigation |
| `secondary` | `NavigationItem[]` | `[]` | Supplementary links |

`NavigationItem` is `{ label, href?, children?, external? }`. `href` is optional
on the type because a derived folder group may not have an index note; authored
items require a non-empty `href`, and `external` marks links that open in a new
tab.

## Exports

- `navigation(options?)` — plugin factory
- `navigation` — alias of `navigation`
- `NAVIGATION_PLUGIN_NAME` — the plugin name, `"navigation"`
- `buildNavigation(entries, options?)` — build a model from manifest entries
- `resolveSiteNavigation(config, manifest)` — find the enabled plugin and build
  the model, or `null`
- `validateNavigationOptions(options)` — option validation
- `SiteNav` — render a resolved tree with the standard `rb-nav` structure
- `MobileSiteNav` — render the plugin-owned compact navigation menu
- Types: `NavigationItem`, `NavigationOptions`, `NavigationSource`,
  `SiteNavigation`, `SiteNavProps`, `MobileSiteNavProps`

## Limitations

- Derivation follows the rendered language when the `l10n` plugin writes
  language metadata, so a localized vault's navigation never mixes languages.
  In a vault without localization metadata, every discoverable entry is used.
- Ordering is alphabetical by title. Frontmatter ordering is not read.
- There is no `exclude`/`include`/`order` option yet; add one only when a real
  site needs it.

## See also

- [Configuration reference](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/configuration.md)
- [Plugin guide](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.md)
