---
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
