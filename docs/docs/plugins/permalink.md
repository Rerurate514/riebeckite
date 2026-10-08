# Permalink

Stable, configurable public URLs (permalinks) for Riebeckite content.

Instead of coupling public URLs directly to the filesystem layout, this plugin can build URLs from frontmatter IDs, deterministic path-derived IDs, or custom resolvers. Legacy URLs can also be registered as redirects in the same configuration.

[日本語](./permalink.ja.md)

## Basic usage

```ts
import { defineConfig } from "@riebeckite/core";
import { permalink } from "@riebeckite/plugin-permalink";

export default defineConfig({
  plugins: [
    permalink({
      frontmatter: "id",
      id: {
        strategy: "frontmatter-or-hash",
        length: 12,
      },
      path: {
        mode: "flat",
        prefix: "/n",
        trailingSlash: false,
      },
      redirects: {
        frontmatter: "redirect_from",
        status: 308,
      },
    }),
  ],
});
```

Given the following content:

```md
---
id: hello-world
---

# Hello
```

with `path.mode: "flat"` and `path.prefix: "/n"`, the public URL becomes:

```text
/n/hello-world
```

With the default `frontmatter-or-hash` strategy, content without a frontmatter ID receives a deterministic ID derived from its file path.

This means an existing Obsidian vault does not need an `id` field added to every file.

---

## How it works

`permalink()` uses the build-time `resolveContentLocations` extension point to resolve the public location of each content entry.

Conceptually:

```text
Content
   │
   ├─ frontmatter
   ├─ slug
   └─ source path
          │
          ▼
@riebeckite/plugin-permalink
          │
          ├─ resolve ID
          ├─ resolve path
          ├─ normalize
          ├─ validate
          └─ redirects
          │
          ▼
ContentPublicLocation
          │
          ├─ permalink
          ├─ redirects
          └─ metadata
```

Core treats the resolved `permalink` as the canonical public URL.

The same canonical URL is then used by Wikilinks, backlinks, search, the content graph, SEO canonical URLs, sitemaps, RSS / Atom / JSON Feed, and other consumers.

Without this plugin, Riebeckite still resolves every URL through the Core default public location resolver, `resolveDefaultContentLocation`, which maps `index` to `/` and every other entry to `/{slug}`. That default is a first-class Core policy, not a fallback.

---

## Frontmatter

### ID

By default, the plugin reads the `id` field:

```md
---
id: hello-world
---
```

The field name is configurable:

```ts
permalink({
  frontmatter: "permalink-id",
});
```

```md
---
permalink-id: hello-world
---
```

`frontmatter` refers to a top-level frontmatter field.

### Permalink override

A specific entry can override its public URL entirely:

```md
---
id: about-page
permalink: /about
---
```

The explicit permalink takes precedence over normal ID and path resolution.

The content ID and its public location remain separate concepts:

```text
ID
about-page

Canonical URL
/about
```

The field name can also be changed:

```ts
permalink({
  override: {
    frontmatter: "url",
  },
});
```

### Redirects

Legacy URLs can be declared in frontmatter:

```md
---
id: hello-world
redirect_from:
  - /posts/hello
  - /blog/2024/hello-world
---
```

If the canonical URL is:

```text
/n/hello-world
```

the redirects resolve to it:

```text
/posts/hello
        ↓ 308
/n/hello-world

/blog/2024/hello-world
        ↓ 308
/n/hello-world
```

Configure the field and status with:

```ts
permalink({
  redirects: {
    frontmatter: "redirect_from",
    status: 308,
  },
});
```

`redirect_from` accepts either a string or an array of strings.

---

## Options

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `frontmatter` | `string` | `"id"` | Top-level frontmatter field used as the ID |
| `id.strategy` | `"frontmatter" \| "hash" \| "frontmatter-or-hash"` | `"frontmatter-or-hash"` | How IDs are resolved |
| `id.length` | `number` | `12` | Length of path-derived hash IDs (6–43) |
| `path.mode` | `"flat" \| "preserve" \| "append"` | `"flat"` | How the resolved ID is placed into the public URL |
| `path.prefix` | `string` | `"/n"` | URL prefix. `"/"` or an empty string means no prefix |
| `path.trailingSlash` | `boolean` | `false` | Whether canonical URLs end with `/` |
| `index.collapse` | `boolean` | `true` | Whether the `index` segment is collapsed |
| `override.frontmatter` | `string` | `"permalink"` | Frontmatter field containing a complete permalink override |
| `redirects.frontmatter` | `string` | `"redirect_from"` | Frontmatter field containing legacy URLs |
| `redirects.status` | `301 \| 302 \| 307 \| 308` | `308` | Redirect HTTP status |
| `resolveId` | `(content) => string` | — | Fully customize ID resolution |
| `resolvePath` | `({ content, id }) => string` | — | Fully customize public path generation |

---

## ID strategies

### `frontmatter`

Uses the configured frontmatter field as the ID.

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter",
  },
});
```

Every content entry must provide the field. A missing ID causes a build error.

This is useful when URL identity should be explicitly controlled:

```md
---
id: article-123
---
```

With `flat` mode, renaming or moving the source file does not change the ID or public URL.

---

### `hash`

Ignores the frontmatter ID and derives the ID from the source file path.

```ts
permalink({
  id: {
    strategy: "hash",
    length: 12,
  },
});
```

The input path is normalized by:

- replacing `\` with `/`
- stripping leading `/`
- applying Unicode NFC normalization

The normalized path is hashed using SHA-256, encoded as base64url, and truncated to `id.length`.

```text
notes/flutter/riverpod.md
        │
        ▼
normalized path
        │
        ▼
SHA-256
        │
        ▼
base64url
        │
        ▼
K7m3Qp8d...
```

The same path produces the same ID across operating systems and build environments.

Because the source path is the input, renaming or moving the file changes the ID.

---

### `frontmatter-or-hash`

This is the default strategy.

```ts
permalink({
  frontmatter: "id",
  id: {
    strategy: "frontmatter-or-hash",
  },
});
```

Resolution works as follows:

```text
frontmatter ID exists
        ↓
use frontmatter ID

frontmatter ID missing
        ↓
derive ID from path
```

This is useful for existing Obsidian vaults: content works without modification, while important entries can opt into explicit stable IDs.

---

## ID metadata

The source of a resolved ID is exposed through metadata.

| `metadata.idSource` | Meaning |
| --- | --- |
| `frontmatter` | Taken from the configured frontmatter field |
| `derived` | Derived from the source path hash |
| `custom` | Returned by `resolveId` |

A manual `permalink` override changes the URL without removing identity. When the frontmatter ID is present it is still recorded (`metadata.idSource` is `frontmatter`); metadata is omitted only when no explicit ID exists. Overrides never produce an implicit `/{id}` URL.

---

## URL path modes

ID resolution and URL composition are separate concerns.

Assume:

```text
Source:
notes/flutter/hello.md

ID:
hello-world
```

### `flat`

```ts
path: {
  mode: "flat",
  prefix: "/n",
}
```

Result:

```text
/n/hello-world
```

The filesystem directory structure is not exposed in the public URL.

This mode is useful for opaque, location-independent URLs.

---

### `preserve`

Preserves the source directory structure while placing the ID into the resulting URL.

```ts
path: {
  mode: "preserve",
  prefix: "/n",
}
```

Example:

```text
notes/flutter/hello.md

↓

/n/notes/flutter/hello-world
```

---

### `append`

`append` is also available:

```ts
path: {
  mode: "append",
}
```

The current implementation returns the same path as `preserve`.

The mode exists separately so it can represent different composition semantics in the future. Do not rely on `append` having behavior distinct from `preserve` in the current version.

---

## Index files

`index.collapse` controls how `index.md` is represented.

```ts
index: {
  collapse: true,
}
```

For:

```text
notes/flutter/index.md
```

with ID `hello-world`:

| Configuration | URL |
| --- | --- |
| `flat` | `/n/hello-world` |
| `preserve` + collapse | `/n/notes/flutter/hello-world` |
| `preserve` + no collapse | `/n/notes/flutter/index/hello-world` |

`flat` does not use the filesystem directory structure, so index collapsing does not affect it.

---

## Advanced: Custom resolvers

For URL schemes that cannot be expressed with the built-in strategies, `resolveId` and `resolvePath` provide escape hatches.

Prefer the built-in options when they are sufficient. Custom resolvers are intended for project-specific identity and URL schemes.

### `resolveId`

`resolveId` lets you compute the content ID yourself.

```ts
permalink({
  resolveId(content) {
    return `post-${content.slug}`;
  },

  path: {
    mode: "flat",
    prefix: "/articles",
  },
});
```

Conceptually:

```text
Content
   ↓
resolveId(content)
   ↓
ID
   ↓
built-in path resolver
   ↓
canonical URL
```

Values returned by `resolveId` still pass through the same ID validation as built-in IDs.

A custom resolver therefore does not bypass the plugin's normal validation.

#### Example: derive an ID from custom frontmatter

Suppose your content uses:

```md
---
category: flutter
serial: 42
---
```

You can define a project-specific ID:

```ts
permalink({
  resolveId(content) {
    const category = content.frontmatter.category;
    const serial = content.frontmatter.serial;

    if (typeof category !== "string") {
      throw new Error("category is required");
    }

    if (typeof serial !== "number") {
      throw new Error("serial is required");
    }

    return `${category}-${serial}`;
  },

  path: {
    mode: "flat",
    prefix: "/articles",
  },
});
```

Result:

```text
/articles/flutter-42
```

Validation of project-specific frontmatter values inside a custom resolver is the resolver's responsibility.

---

## Advanced: `resolvePath`

`resolvePath` gives full control over how a resolved ID becomes a public URL.

```ts
permalink({
  frontmatter: "id",

  id: {
    strategy: "frontmatter-or-hash",
  },

  resolvePath({ content, id }) {
    return `/articles/${id}`;
  },
});
```

Result:

```text
/articles/hello-world
```

The returned value must be a site-local absolute path.

```text
/articles/hello     valid
/articles/hello/    valid
articles/hello      invalid
https://example.com invalid
```

The result still passes through the plugin's normal URL normalization, validation, and collision detection.

---

## Combining `resolveId` and `resolvePath`

Both resolvers can be used together when both identity and URL structure are project-specific.

For example:

```md
---
published: 2026-09-28
article_id: riebeckite-permalink
---
```

```ts
permalink({
  resolveId(content) {
    const value = content.frontmatter.article_id;

    if (typeof value !== "string") {
      throw new Error("article_id is required");
    }

    return value;
  },

  resolvePath({ content, id }) {
    const published = content.frontmatter.published;

    if (typeof published !== "string") {
      throw new Error("published is required");
    }

    const year = published.slice(0, 4);

    return `/articles/${year}/${id}`;
  },
});
```

Result:

```text
/articles/2026/riebeckite-permalink
```

Riebeckite still treats only the final resolved URL as the canonical public location.

---

## Choosing between built-in and custom resolution

A useful rule is:

```text
Built-in strategies are sufficient
        ↓
Use normal options

Only ID generation is special
        ↓
Use resolveId

Only URL structure is special
        ↓
Use resolvePath

Both are project-specific
        ↓
Use resolveId + resolvePath
```

For example, creating `/n/{id}` does not require a custom resolver:

```ts
permalink({
  id: {
    strategy: "frontmatter-or-hash",
  },

  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

This is preferable because the intent is clearer and the configuration remains declarative.

---

## Guarantees with custom resolvers

Using a custom resolver does not bypass the rest of the Permalink Plugin pipeline.

The following behavior is still preserved:

- ID validation
- URL normalization
- URL validation
- ID collision detection
- canonical URL collision detection
- redirect collision detection
- trailing slash handling
- canonical public location registration in Core

Custom resolvers change how the ID or path is produced, not how the resulting public location is validated and registered.

---

## Manual permalink precedence

A manual permalink override takes precedence over normal ID and path resolution.

For example:

```md
---
id: abc
permalink: /about
---
```

is treated conceptually as:

```text
ID candidate
abc

Canonical URL
/about
```

If `resolvePath` is also configured, the manual permalink override still wins.

This makes it possible to use a general URL strategy while giving a few special pages fixed URLs.

---

## Stateless builds

The Permalink Plugin does not maintain a persistent ID registry.

It does not create or require:

```text
.riebeckite/content-ids.json
state.json
SQLite database
KV database
```

Public locations are derived at build time from:

```text
Plugin configuration
+
source content
```

This makes the same configuration suitable for local builds, CI, and Cloudflare Workers deployments without additional identity state.

With the `hash` strategy, the source path is part of the identity input. Renaming or moving a file therefore changes its derived ID.

Use explicit frontmatter IDs for content whose URL must survive source-file moves.

---

## Rename and move behavior

URL stability depends on both the ID strategy and path mode.

| ID strategy | Path mode | Rename | Move |
| --- | --- | --- | --- |
| frontmatter | flat | Preserved | Preserved |
| frontmatter | preserve | May change | Changes |
| frontmatter | append | May change | Changes |
| hash | flat | Changes | Changes |
| hash | preserve | Changes | Changes |
| hash | append | Changes | Changes |

For explicitly managed permanent URLs:

```ts
permalink({
  frontmatter: "id",

  id: {
    strategy: "frontmatter",
  },

  path: {
    mode: "flat",
  },
});
```

For existing vaults where adding IDs everywhere is undesirable:

```ts
id: {
  strategy: "frontmatter-or-hash",
}
```

is usually more convenient.

---

## Validation

### IDs

An ID must represent a single URL path segment.

The following are rejected:

- empty values
- `/`
- `#`
- `?`
- whitespace
- malformed percent-encoding

Values returned by `resolveId` are subject to the same rules.

### Permalinks

Permalinks and redirects must be site-local absolute paths.

The following are rejected:

- relative paths
- query strings
- fragments
- `\`
- invalid `//`
- external URLs

Values returned by `resolvePath` are subject to the same rules.

---

## Collision detection

The plugin detects conflicting public locations during the build.

This includes:

- ID ↔ ID
- canonical URL ↔ canonical URL
- canonical URL ↔ redirect
- redirect ↔ redirect

For example:

```text
a.md
→ /about

b.md
→ /about
```

fails the build.

The following also fails:

```text
a.md canonical
→ /about

b.md redirect
→ /about
```

The plugin does not silently append suffixes to resolve collisions.

This prevents public URLs from changing based on build or content ordering.

---

## Inspecting resolved URLs

Resolved values can be inspected through Riebeckite's existing content inspection command:

```sh
riebeckite inspect content --list
```

When the Permalink Plugin is enabled, the output can expose the resolved ID, ID source, and permalink for each entry.

For example:

```text
PATH                 ID            ID SOURCE     PERMALINK
notes/a.md           K7m3Qp8d...   derived       /n/K7m3Qp8d...
notes/about.md       about         frontmatter   /about
```

The exact output format may vary between CLI versions.

---

## Exports

### Functions

- `permalink(options?)`
- `permalinkPlugin(options?)`

Both create the Permalink Plugin.

### Types

- `PermalinkOptions`
- `PermalinkIdStrategy`
- `PermalinkPathMode`
- `RedirectStatus`

Use the exported types when building type-safe project-specific resolver configuration.

---

## Configuration examples

### Existing Obsidian vault

Hide the filesystem layout without requiring frontmatter changes across the vault:

```ts
permalink({
  frontmatter: "id",

  id: {
    strategy: "frontmatter-or-hash",
    length: 12,
  },

  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

### Explicit permanent IDs

Require every entry to define its identity explicitly:

```ts
permalink({
  frontmatter: "id",

  id: {
    strategy: "frontmatter",
  },

  path: {
    mode: "flat",
    prefix: "/n",
  },
});
```

### Preserve directory structure

```ts
permalink({
  id: {
    strategy: "frontmatter-or-hash",
  },

  path: {
    mode: "preserve",
    prefix: "",
  },
});
```

### Fully custom URL scheme

```ts
permalink({
  resolveId(content) {
    // Project-specific identity.
    return "...";
  },

  resolvePath({ content, id }) {
    // Project-specific public URL.
    return `/articles/${id}`;
  },
});
```

---

## See also

- [Plugin guide](../reference/plugin-api.md)
- [Content system](../framework/content-system.md)
