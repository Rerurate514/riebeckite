---
date: 2026-10-14
title: Frontmatter
sidebar:
  hidden: true
---

# Frontmatter

The YAML block at the top of a content file, parsed into typed metadata such as title, date, tags, and visibility. It also carries the stable id that identifies the note independently of its slug.

## Common fields

| Field | Purpose |
| --- | --- |
| `title` | Display title |
| `date` | Publish or sort date |
| `tags` | [Taxonomy](./taxonomy.md) values |
| `series` | [Series](./series.md) membership |
| `published` | Publish decision |
| `visibility` | Listed or [unlisted](./unlisted.md) |
| `aliases` | Extra link keys |
| `id` | Stable [content id](./content-id.md) |

## Parsing

Frontmatter is parsed before the Markdown body, so hooks and location resolution can read metadata first. Unknown fields stay available for plugins.

## Frontmatter publish fields

Frontmatter carries three stable fields that determine how a note is published, shared across `explicit` and `selective` publish strategies:

- **`publish`**: When the strategy is `explicit`, only notes with `publish: true` are public. When `selective`, this field is ignored.
- **`private`**: When the strategy is `selective`, notes with `private: true` are excluded from public output. When `explicit`, this field is ignored.
- **`draft`**: When the strategy is `selective`, notes with `draft: true` are excluded from public output. When `explicit`, this field is ignored.

The publish decision is made by `isPublishable(strategy, frontmatter)` in `packages/core/src/types/publish_strategy.ts`:

```ts
export function isPublishable(
  strategy: PublishStrategy,
  frontmatter: PublishFrontmatter | undefined,
): boolean {
  if (strategy === "explicit") {
    return frontmatter?.publish === true;
  }
  return !(frontmatter?.private === true || frontmatter?.draft === true);
}
```

The `PublishFrontmatter` type is:

```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```

## Frontmatter parsing

Frontmatter is parsed before the Markdown body, so hooks and location resolution can read metadata first. Unknown fields stay available for plugins. The parsed frontmatter is stored in `PostFrontmatter` type and becomes the `frontmatter` field of `ContentManifestEntry` (`packages/core/src/types/content_manifest.ts`). It is also used by `resolvePublishingState` to determine the publishing state.

```ts
// From packages/core/src/types/post_content.ts
export type PostFrontmatter = {
  title?: string;
  date?: string | Date;
  tags?: string[];
  series?: string;
  published?: boolean;
  visibility?: "public" | "unlisted" | "draft" | "scheduled";
  aliases?: string[];
  id?: string;
};
```

## Related terms

- [[glossary/page|Page]]
- [[publish-strategy|Publish Strategy]]
