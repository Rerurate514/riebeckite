---
date: 2026-10-14
title: Unlisted
sidebar:
  hidden: true
---

# Unlisted

A publishing state where a page is served at its URL but kept out of listings and feeds. It is routable yet not discoverable, which suits share links and draft-like pages.

## Setting it

```yaml
---
visibility: unlisted
---
```

## Effect

The page stays [routable](./routable.md) and produces output, but it is excluded from the [discoverable](./discoverable.md) view, so listings and feeds skip it.

## Publishing state

Unlisted is one of the `PublishingVisibility` values (`packages/core/src/content/publishing.ts`). When `visibility: unlisted` is set in frontmatter, `resolvePublishingState` returns `routable: true, discoverable: false`. This means:

- The page is served at its URL and generates output
- It is excluded from the `discoverableEntries` view
- It does not appear in listings, feeds, or taxonomy term pages
- It can still be reached via direct URL or wikilink

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
};
```

## Relation to draft

Unlike `draft` visibility, an unlisted page is still considered published and routable. Drafts (`published: false` or `visibility: draft`) are excluded from routing entirely and produce no public output until they are published.
