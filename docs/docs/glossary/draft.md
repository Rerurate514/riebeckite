---
title: Draft
sidebar:
  hidden: true
---

# Draft

Content that is kept out of the published site by the publish decision. Drafts can still be processed, but they are excluded from the routable and discoverable views until they are published.

## Setting it

```yaml
---
published: false
---
```

## What still happens

A draft can still be parsed and linked internally, so you can preview and cross-reference it. It produces no public output until it is [published](./publish.md).

## Publishing state

Draft is one of the `PublishingVisibility` values (`packages/core/src/content/publishing.ts`). When a note has `published: false` or `visibility: draft`, `resolvePublishingState` returns `routable: false, discoverable: false`. This means:

- The note is excluded from `publicEntries` and `byRoutablePermalink`
- It will not produce any public output
- It can still be parsed and internally linked for preview purposes
- It remains in the full `entries` manifest so that once published, its existing content and links are preserved

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
};
```
