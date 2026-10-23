---
date: 2026-10-14
title: Publish Strategy
sidebar:
  hidden: true
---

# Publish Strategy

The configuration value that decides how content becomes public, such as publishing everything or only content marked for publishing. It sets the default side of the publication boundary.

## Values

| Strategy | Behavior |
| --- | --- |
| all | Content is public unless frontmatter opts out |
| selective | Only content marked for publishing is public |

## Interaction with frontmatter

The strategy sets the default, and frontmatter such as `published` refines it. Together they form the [publication boundary](./publication-boundary.md).

## Strategy Resolution
The strategy is resolved from `config.content.filters.publishStrategy` in the [resolved Riebeckite config](../framework/honox-integration/site.md). The value is either `"explicit"` or `"selective"`, stored as `PublishStrategy`.

## Explicit vs Selective
The two strategies govern how frontmatter fields determine publication, per `packages/core/src/types/publish_strategy.ts`:

- **explicit**: `publish === true` — only notes with `publish: true` in frontmatter are public. All others are excluded.
- **selective**: not (`private === true` or `draft === true`) — notes are public by default, unless marked `private: true` or `draft: true`.

```ts
export type PublishStrategy = "explicit" | "selective";

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

## Publish strategy in the resolved config
The publish strategy is resolved during config resolution and stored in `config.content.filters.publishStrategy`. The `isPublished` function from `@riebeckite/core` uses this strategy to determine whether each note should be included in the build output:

```ts
import { isPublished } from "@riebeckite/core";

const published = isPublished(config, frontmatter, { buildTime: new Date() });
```

If `strategy` is `"explicit"`, only notes with `publish: true` in frontmatter are published. If `"selective"`, notes are published unless they have `private: true` or `draft: true` in frontmatter. This function is called during the build pipeline to filter content before output generation.

## Related terms
