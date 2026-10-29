---
date: 2026-10-06
title: Configuration reference
---
# Configuration reference

This page lists every field in `riebeckite.config.ts`. For how the configuration
is resolved (filesystem roots, content selection, publishing rules), see
[Configuration](./configuration.md).

## Writing the config file

Create `riebeckite.config.ts` at the application root and export the result of
`defineConfig`.

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  site: {
    title: "My site",
    baseUrl: "https://example.com",
  },
});
```

`defineConfig` is a type-checking helper: it returns its argument unchanged and
adds no runtime behavior. Keep `export default` as the config entry so the
integration can import it.

Riebeckite resolves the config file from `configRoot`. For the Vite integration
this defaults to the application root, and the file name defaults to
`riebeckite.config.ts`. The CLI searches parent directories from the current
directory and also accepts `riebeckite.config.js` and `riebeckite.config.mjs`.
If the file lives elsewhere or has a different name, pass `configRoot` and
`configFile` to `riebeckiteVite()`.

### Top-level sections

| Section | Required | Purpose |
| --- | --- | --- |
| `site` | Yes | Site identity and SEO defaults |
| `content` | No | Where content is read and what is published |
| `theme` | No | Appearance and design tokens |
| `plugins` | No | Content, rendering, and discovery features |
| `cache` | No | Persistent build cache |
| `spa` | No | Client-side navigation, prefetch, scroll restoration, and view transitions |

Only `site` is required. Every other section falls back to the default in its
table.

## site

`site` identifies the site and supplies fallbacks for page metadata.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `title` | `string` | required, non-empty | Site name. Appears in page titles, `og:site_name`, and JSON-LD `publisher.name`. |
| `description` | `string` | `""` | Fallback for `<meta name="description">`, `og:description`, and JSON-LD. |
| `author` | `string` | `""` | `<meta name="author">` and JSON-LD `author`. |
| `baseUrl` | `string` | `""` | Absolute HTTP(S) URL used to build canonical, Open Graph, feed, and webmention URLs. |
| `locale` | `string` | `"en"` | `<html lang>` and `og:locale`. SEO converts `_` to `-` in `inLanguage`. |
| `twitterSite` | `string` | `""` | Value for `<meta name="twitter:site">`. The site shell emits the tag; the SEO plugin does not. |
| `defaultOgImage` | `string` | `""` | Fallback image for `og:image` and `twitter:image`. |
| `feed` | `object` | see below | Feed metadata. |

`title` must be a non-empty string. `baseUrl` must be an absolute HTTP(S) URL
when set. The remaining strings may be omitted or empty.

### site.feed

`feed.title` and `feed.description` fall back to `site.title` and
`site.description`; `feed.language` falls back to `site.locale`.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `title` | `string` | `site.title` | RSS, Atom, and JSON feed title. |
| `description` | `string` | `site.description` | Feed description. |
| `language` | `string` | `site.locale` | Feed language tag. |

```ts
site: {
  title: "My site",
  description: "Notes and writing",
  baseUrl: "https://example.com",
  locale: "ja_JP",
  feed: { language: "ja" },
}
```

## content

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `directory` | `string` | `"content"` | Filesystem directory containing the content. |
| `source` | `ContentSource` | `undefined` | Custom reader. Replaces the filesystem reader. |
| `exclude` | `string[]` | `[]` | Glob patterns removed before content is processed. |
| `filters.publishStrategy` | `"explicit"` \| `"selective"` | `"explicit"` | Default publishing policy. Frontmatter can override it per note. |

### content.directory

```ts
content: {
  directory: "content",
}
```

A relative `directory` resolves against the application root (`appRoot`), never
against `configRoot` or `process.cwd()`. See
[Filesystem roots and external vaults](./configuration/roots.md).

### content.source

Set `source` to replace the filesystem reader with another source, such as a
remote store. Do not configure `directory` and `source` as two readers for the
same content.

```ts
type ContentSource = {
  scan(): Promise<readonly ContentSourceEntry[]>;
  read(entry: ContentSourceEntry): Promise<string | Uint8Array>;
};

type ContentSourceEntry = {
  path: string;
  metadata?: {
    modifiedAt?: number;
    size?: number;
    etag?: string;
    hash?: string;
  };
};
```

`scan` returns the logical paths to load. `read` returns one entry's content as
a string or bytes. Metadata is optional and used by the cache.

### content.exclude

Patterns match logical paths.

| Symbol | Meaning |
| --- | --- |
| `*` | Matches multiple characters within one path segment. |
| `**` | Matches across directory segments. |
| `?` | Matches any single character. |

```ts
content: {
  directory: "content",
  exclude: ["drafts/**", "**/private/**", ".obsidian/**"],
}
```

Excluded files never enter the content pipeline, so they are unavailable for
links, graph analysis, and diagnostics. This differs from `draft` and
`unlisted`, which stay in the content system but are hidden from routes or
discovery. See [Publishing state](./configuration/content.md#publishing-state).

### content.filters.publishStrategy

| Value | A note is public when |
| --- | --- |
| `"explicit"` | Frontmatter has `publish: true`. |
| `"selective"` | Frontmatter does not have `private: true` or `draft: true`. |

With `"explicit"`, only notes that opt in are published:

```yaml
---
publish: true
---
```

With `"selective"`, notes are published unless they are explicitly marked
private.

Frontmatter `visibility` and `publishAt` take precedence over the strategy. The
full decision table is in
[Publishing state](./configuration/content.md#publishing-state).

## theme

`theme` accepts a theme instance returned by a theme definition. A definition
owns its styles, settings schema, and presets.

| Field | Type | Default |
| --- | --- | --- |
| `colorMode` | `"light"` \| `"dark"` \| `"system"` | `"system"` |
| `layout` | `"article"` \| `"sidebar"` \| `"full-width"` | `"article"` |
| `preset` | declared preset name | none |
| `settings` | inferred from the schema | schema defaults |
| `stylesheets` | `string[]` | `[]` |

Unknown settings and invalid values fail resolution. Core resolves defaults,
then the preset, then explicit settings, and reflects the result through
`data-rb-theme`, `data-rb-mode`, `data-rb-layout`, and `data-rb-setting-*`.

### Declared themes

A theme package exposes a factory. Pass its options and hand the result to
`theme`.

```ts
import { rerurateTheme } from "@riebeckite/theme-rerurate";

export default defineConfig({
  site: { title: "My site" },
  theme: rerurateTheme({ colorMode: "system", settings: { motion: true } }),
});
```

Theme-specific options are owned by the theme package, not by Core. See
[Theme system](./theme-api.md).

## plugins

`plugins` is an array of plugin instances. `false`, `null`, and `undefined` are
dropped, so a boolean can toggle a plugin.

```ts
plugins: [
  obsidianMarkdown(),
  enableSearch && search(),
]
```

Resolution removes disabled inputs, orders enabled plugins by `order`, and
validates capabilities. Two enabled plugins that share a `name` fail
resolution. Each plugin's `validateOptions` runs while the config is resolved.

Individual plugin options are documented in the [plugin guides](../plugins/README.md)
and the [Plugin system](./plugin-api.md).

## cache

`cache` controls the persistent build cache.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `enabled` | `boolean` | `true` | Set `false` to disable the cache and rebuild everything. |
| `directory` | `string` | `<buildDirectory>/cache` | Overrides where cache entries are stored. |

```ts
cache: {
  enabled: true,
}
```

Disabling the cache or moving its directory affects build time only, not the
output. See [Build cache](./configuration/cache.md#build-cache).

## spa

`spa` enables client-side navigation. `true` uses the defaults; an object
configures the behavior. Omit it or set `false` to keep normal browser
navigation.

| Field | Type | Default | Effect |
| --- | --- | --- | --- |
| `prefetch` | `false` \| `"hover"` | `false` | Fetches a same-origin page when the pointer enters its link. |
| `scrollRestoration` | `boolean` | `true` | Saves and restores scroll positions for history entries. |
| `viewTransitions` | `boolean` | `false` | Uses the browser View Transitions API when available and motion is allowed. |

```ts
spa: {
  prefetch: "hover",
  viewTransitions: true,
}
```

Config validation only checks that `spa` is a boolean or an object; invalid
option values throw when the runtime starts. See
[SPA navigation](../guides/spa-navigation.md) for link handling and renderer
requirements.

## Validation

An invalid configuration throws `ConfigValidationError`, which lists each
offending path and message. Do not catch and ignore it. Run `check` after any
change:

```sh
npm exec riebeckite check
```

## See also

- [Configuration](./configuration.md) — roots, content selection, publishing
- [Plugin system](./plugin-api.md) — the plugin contract
- [Theme system](./theme-api.md) — design tokens and the CSS contract
- [CLI](./cli.md) — `check`, `doctor`, and `inspect`
