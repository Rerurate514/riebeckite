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

## Publish resolution flow

The publish decision is made by `resolvePublishingState` (`packages/core/src/content/publishing.ts`), which considers both the publish strategy and frontmatter fields. The function returns a `ResolvedPublishingState` with `visibility`, `routable`, and `discoverable` fields:

- If explicit visibility is `"draft"` → draft state, not routable or discoverable
- If `publishAt` is set and in the future → scheduled state, not routable or discoverable
- If explicit visibility is `"unlisted"` → unlisted state, routable but not discoverable
- If explicit visibility is `"public"` or `publishAt` is set → public state, routable and discoverable
- Otherwise → `isPublishable` is called with the strategy; if true → public, if false → draft

```ts
// From packages/core/src/content/publishing.ts
export function resolvePublishingState(
  frontmatter: PostFrontmatter | undefined,
  options: PublishingResolutionOptions,
): ResolvedPublishingState {
  // ... logic as above
}
```

## Publish strategy configuration

The publish strategy is configured per-site and defaults to `"selective"`. In `explicit` strategy mode, only notes with `publish: true` in frontmatter are public. In `selective` mode (the default), notes are public unless `private: true` or `draft: true` is set.

```ts
// From packages/core/src/types/publish_strategy.ts
export type PublishStrategy = "explicit" | "selective";
```

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
