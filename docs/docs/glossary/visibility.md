---
date: 2026-10-14
title: Visibility
sidebar:
  hidden: true
---

# Visibility

A frontmatter field that refines how a published page is exposed. It separates a listed page from an unlisted one without turning the page into a draft.

## Values

| Value | Served at URL | In listings |
| --- | --- | --- |
| listed (default) | Yes | Yes |
| unlisted | Yes | No |

## Not the same as published

`visibility` fine-tunes exposure; `published` decides whether the page is public at all. An [unlisted](./unlisted.md) page is published but hidden from listings.

## Publishing state integration

The `visibility` frontmatter field is one of the inputs to `resolvePublishingState` (`packages/core/src/content/publishing.ts`). Together with the publish strategy and `published` field, it determines the final `ResolvedPublishingState`:

- `visibility: "listed"` (default) + `published: true` → `visibility: "public", routable: true, discoverable: true`
- `visibility: "unlisted"` + `published: true` → `visibility: "unlisted", routable: true, discoverable: false`
- `visibility: "public"` or `visibility: "unlisted"` with `published: false` → `visibility: "draft", routable: false, discoverable: false`

This means `visibility` controls whether a published page appears in listings, while `published` controls whether it is public at all.

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
  publishAt?: Date;
};
```
