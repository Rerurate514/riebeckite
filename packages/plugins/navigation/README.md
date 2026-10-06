# @riebeckite/plugin-navigation

Site navigation as a Riebeckite plugin. `navigation()` derives the primary
navigation from the notes already in the vault, so an existing Obsidian vault
becomes navigable with no Riebeckite-specific file and no required frontmatter.
The plugin owns the navigation *model*; the Site shell owns rendering and
placement.

[日本語](./README_ja.md)

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
- `navigationPlugin` — alias of `navigation`
- `NAVIGATION_PLUGIN_NAME` — the plugin name, `"navigation"`
- `buildNavigation(entries, options?)` — build a model from manifest entries
- `resolveSiteNavigation(config, manifest)` — find the enabled plugin and build
  the model, or `null`
- `validateNavigationOptions(options)` — option validation
- Types: `NavigationItem`, `NavigationOptions`, `NavigationSource`,
  `SiteNavigation`

## Limitations

- Derivation follows the rendered language when the `l10n` plugin writes
  language metadata, so a localized vault's navigation never mixes languages.
  In a vault without localization metadata, every discoverable entry is used.
- Ordering is alphabetical by title. Frontmatter ordering is not read.
- There is no `exclude`/`include`/`order` option yet; add one only when a real
  site needs it.

## See also

- [Configuration reference](../../../docs/docs/reference/configuration.en.md)
- [Plugin guide](../../../docs/docs/reference/plugin-api.en.md)
