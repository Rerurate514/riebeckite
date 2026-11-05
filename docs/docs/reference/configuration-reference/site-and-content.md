---
date: 2026-10-06
title: Site and content
sidebar:
  label: Site and content
  order: 10
---
# Site and content

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
| `filters.publishStrategy` | `"explicit"` \| `"selective"` | `"explicit"` | Default publishing policy. [[glossary/frontmatter|Frontmatter]] can override it per note. |

### content.directory

```ts
content: {
  directory: "content",
}
```

A relative `directory` resolves against the application root (`appRoot`), never
against `configRoot` or `process.cwd()`. See
[Filesystem roots and external vaults](../configuration/roots.md).

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
    createdAt?: number;
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

Patterns match logical paths (e.g., `exclude: ["drafts"]` matches `drafts.md`).

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

Excluded files never enter the built-in filesystem source, so they are unavailable for links, graph analysis, and diagnostics. When you configure `content.source`, that source must apply its own filtering. This differs from `draft` and `unlisted`, which stay in the content system but are hidden from routes or discovery. See [Publishing state](../configuration/content.md#publishing-state).

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
[Publishing state](../configuration/content.md#publishing-state).
