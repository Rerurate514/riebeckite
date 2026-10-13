---
title: Publish
sidebar:
  hidden: true
---

# Publish

The decision to include content in the published site, controlled by the publish strategy and frontmatter such as published and visibility. Published content enters the publication boundary views.

## Inputs to the decision

- The configured publish strategy.
- The `published` frontmatter field.
- The `visibility` frontmatter field.

## Result

Content that passes enters the [routable](./routable.md) and [discoverable](./discoverable.md) views. Content that fails is a [draft](./draft.md) and is excluded from the published set.

## Publish Frontmatter
The decision is grounded in the `PublishFrontmatter` type from `packages/core/src/types/publish_strategy.ts`:
```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```
Three fields control the publish decision: `publish` (opt-in), `private` (opt-out), and `draft` (unpublished). The presence and values of these fields are interpreted differently depending on the active strategy.

## isPublishable Logic
The `isPublishable` function (`packages/core/src/types/publish_strategy.ts`) implements two strategies:
- **explicit**: `frontmatter.publish === true` — only notes explicitly opted in are public.
- **selective**: not (`private === true` or `draft === true`) — notes are public unless explicitly hidden.

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
