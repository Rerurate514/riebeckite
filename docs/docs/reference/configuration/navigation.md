---
title: Navigation
sidebar:
  label: Navigation
  order: 10
---

# Navigation

Navigation is provided by the **`@riebeckite/plugin-navigation`** plugin, not by a top-level config section. The plugin produces a semantic model `{ primary, secondary }` and owns the rendering mechanics through `SiteNav`; the **Site decides where each rendered list is placed**. `primary` and `secondary` express prominence, not placement; there is no `header` or `footer` key.

```ts
import { defineConfig } from "@riebeckite/core";
import { navigation } from "@riebeckite/plugin-navigation";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  plugins: [navigation()],
});
```

## Rendering

`SiteNav` from `@riebeckite/plugin-navigation` renders a resolved tree with the standard `rb-nav` structure, active-path detection, locale-aware normalization, and the `aria-current` contract. The Site decides where the tree is placed:

```tsx
import { SiteNav } from "@riebeckite/plugin-navigation";

<SiteNav
  items={model.primary}
  path={c.req.path}
  language={c.get("htmlLanguage")}
/>;
```

Pass `localizeHref` to rewrite hrefs (for example to localize docs links), `label` to change the landmark label, and `class`/`className` to extend the `<nav>` classes.

## Zero-config derivation

Called with no arguments, the plugin derives `primary` links from the vault's **discoverable entries** (`manifest.discoverableEntries`: public and discoverable, excluding draft and non-routable content). It reuses existing Riebeckite information rather than a dedicated vault file:

- folder structure (a folder becomes a section, and nested folders become `children`)
- README / index resolution (an `index` or `README` note represents its folder and supplies the folder `href`)
- a folder without a README or index renders as a label with no link
- a root README or index never appears in the navigation
- page `title` (falling back to a formatted slug segment)
- `permalink`

It requires **no Riebeckite-specific vault file** (no `navigation.md`) and **no required frontmatter**.

Derivation follows the language being rendered. Using the language metadata written by the `l10n` plugin, entries that share a translation collapse into a single item and only the current language's `href` is used, so a page under `/ja/guide/` never mixes in `/en/...`. Vaults that do not use `l10n` keep deriving from every entry.

## Manual and supplementary links

Pass `items` to replace the derived `primary` links. Pass `secondary` for supplementary links the Site renders less prominently.

```ts
navigation({
  items: [
    { label: "Guide", href: "/guide" },
    {
      label: "Notes",
      href: "/notes/planning",
      children: [
        { label: "Planning", href: "/notes/planning" },
        { label: "Writing", href: "/notes/writing" },
      ],
    },
  ],
  secondary: [
    { label: "GitHub", href: "https://github.com/example/site", external: true },
  ],
});
```

## NavigationItem

Each link is a `NavigationItem`.

| Field | Type | Meaning |
| --- | --- | --- |
| `label` | `string` | Text shown for the link |
| `href` | `string` | Destination path or URL |
| `children` | `NavigationItem[]` | Child items, shown as a submenu |
| `external` | `boolean` | When `true`, opens in a new tab |

`label` and `href` are required on authored items. A derived folder group that has no index note renders as a label only, so `href` is optional in the derived model.

## Placement

The plugin does not decide placement; the Site shell does. In the reference Site, `primary` appears in the header and `secondary` in the footer. Some shells skip a `href: "/"` item because the site title already links home.

## Building submenus

Use `children` to nest navigation.

```ts
{
  label: "Notes",
  href: "/notes/planning",
  children: [
    { label: "Planning", href: "/notes/planning" },
    { label: "Writing", href: "/notes/writing" },
  ],
}
```

`children` render as a submenu.

## Linking to external sites

Add `external: true` for links to other sites.

```ts
{
  label: "GitHub",
  href: "https://github.com/example/site",
  external: true,
}
```

The link opens in a new tab and gets `rel="noreferrer"`.

## Marking the current page

The link for the page currently being viewed becomes active automatically.

For example, with:

```ts
{ label: "Guide", href: "/guide" }
```

the item is active on pages such as:

```text
/guide
/guide/getting-started
/en/guide
/en/guide/getting-started
```

Trailing slashes and a leading locale are normalized during matching, so you do not need to worry about differences such as `/guide/` and `/en/guide`.

An active link gets `aria-current="page"`.

An `href` that does not start with `/` (such as an external URL) and items with `external: true` are never treated as active.

## On mobile

On narrow viewports, the site navigation collapses into a `Menu` disclosure.

The content and HTML structure do not change; only the CSS presentation changes with viewport width.

## Validation

`navigation` options are validated while the plugin is loaded.

The main rules are:

- `label` is a non-empty string
- `href` is a non-empty string
- `external`, when present, is a boolean
- `children` must not contain an ancestor item

Invalid configuration fails while the plugin is loaded.

## Plugin pages are not added automatically

The plugin derives links from the vault's discoverable entries. It does not surface plugin-generated pages on its own.

For example, the following are not added automatically:

- Search
- Tag / Folder indexes
- Taxonomy pages
- Plugin page types
- Breadcrumbs
- Backlinks
- Related Posts
- Other content graph features

To show a page a plugin provides, add a link to that page in `navigation({ items })`.

For the division of responsibility between navigation and plugins, see [Customizing your site](../../guides/customizing-your-site.md#navigation).

## Exported helpers and types

`@riebeckite/plugin-navigation` exports `navigation`, `buildNavigation`, `resolveSiteNavigation`, `NAVIGATION_PLUGIN_NAME`, the `SiteNav` rendering primitive, and the types `NavigationItem`, `NavigationOptions`, `SiteNavigation`, and `SiteNavProps`.
