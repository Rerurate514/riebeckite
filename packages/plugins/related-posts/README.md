# @riebeckite/plugin-related-posts

Build-time "related notes" navigation. For every published entry, the plugin
ranks the other entries in the content manifest and contributes a related-posts
section to the `article.footer` Slot. No client-side JavaScript is required.

[日本語](./README_ja.md)

## Overview

`relatedPosts()` reads the manifest's content graph and scores every other
published entry against the current one:

| Signal | Weight | Meaning |
| ------ | ------ | ------- |
| Direct link | 3 | The entry links to the candidate, or the candidate links to the entry |
| Shared tag | 2 per common tag | The entry and the candidate share a tag |
| Co-citation | 1 per common target | Both entries link to the same note |

Candidates are sorted by score (descending), then by title, then by slug, and
clamped to `limit`. Entries that score below `minScore` are dropped. When no
candidate qualifies, the entry's HTML is left untouched.

The plugin contributes the section to each manifest entry's `article.footer`
Slot. The Site decides where to render that Slot, so the section appears on
generated pages and in feeds when the standard article footer is used.

## Usage

```ts
import { defineConfig } from "@riebeckite/core";
import { relatedPosts } from "@riebeckite/plugin-related-posts";

export default defineConfig({
  // ...
  plugins: [relatedPosts()],
});
```

## Component

In addition to the automatic `article.footer` Slot contribution, the navigation
is available as a server-rendered Hono JSX Component for placement in a Site
layout. Build the entries with the existing helper and pass resolved options:

```tsx
import RelatedPosts from "@riebeckite/plugin-related-posts/components";

<RelatedPosts entries={related} options={resolvedOptions} />;
```

`related` is the result of `buildRelatedPosts()` and `resolvedOptions` is the
result of `resolveRelatedPostsOptions()`. Import `style.css` when the Plugin is
not registered.

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| `limit` | `number` | `5` | Maximum number of related entries |
| `minScore` | `number` | `1` | Minimum score required to be listed |
| `heading` | `boolean` | `true` | Render the `<h2>` heading |
| `headingText` | `string` | `"Related"` | Heading text |
| `className` | `string` | `"rb-related-posts"` | Root CSS class |
| `useTags` | `boolean` | `true` | Include the shared-tag signal |
| `useBacklinks` | `boolean` | `true` | Include the direct-link signal |

```ts
relatedPosts({
  limit: 8,
  minScore: 2,
  headingText: "Related notes",
});
```

## Output

```html
<nav class="rb-related-posts" data-related-posts>
  <h2 class="rb-related-posts__heading">Related</h2>
  <ul>
    <li class="rb-related-posts__item">
      <a class="rb-related-posts__link" href="/notes/example" data-related-score="5">Example Note</a>
    </li>
  </ul>
</nav>
```

## Style

The package ships `style.css`. Register it like any other plugin stylesheet:

```ts
import "@riebeckite/plugin-related-posts/style.css";
```

## Exports

- `relatedPosts(options?)` — plugin factory
- `relatedPostsPlugin` — alias of `relatedPosts`
- `resolveRelatedPostsOptions(options?)` — apply option defaults
- `buildRelatedPosts({ manifest, entry, options, config? })` — rank related entries
- `renderRelatedPosts(entries, options)` — render the navigation HTML
- `RelatedPosts` and `@riebeckite/plugin-related-posts/components` — Hono JSX Component
- Types: `RelatedPostsOptions`, `ResolvedRelatedPostsOptions`, `RelatedPostsEntry`

## Limitations

- Ranking is fixed at build time. A full rebuild always recomputes correctly.
- Only tags, direct links, and co-citations are considered. Reading time,
  recency, and folders are intentionally ignored to keep ranking deterministic.

## See also

- [Plugin guide](../../../docs/docs/reference/plugin-api.md)
