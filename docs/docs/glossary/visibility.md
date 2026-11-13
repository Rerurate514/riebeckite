---
date: 2026-10-14
title: Visibility
sidebar.hidden: true
---

# Visibility

A frontmatter field that refines how a published page is exposed. It separates a listed page from an unlisted one, or forces a page to stay a draft.

## Values

| Value | Served at URL | In listings |
| --- | --- | --- |
| public (default) | Yes | Yes |
| unlisted | Yes | No |
| draft | No | No |

`visibility` accepts `public`, `unlisted`, or `draft`. Any other value fails the build.

## Not the same as publish

`visibility` fine-tunes exposure. Whether a note is published at all is decided by the publish strategy and the `publish`, `private`, and `draft` frontmatter fields. `published` is a date field, not a publication switch.

## Publishing state integration

`resolvePublishingState` (`packages/core/src/content/publishing.ts`) combines `visibility`, `publishAt`, and the configured publish strategy:

- `visibility: "draft"` → `visibility: "draft", routable: false, discoverable: false`
- A future `publishAt` → `visibility: "scheduled", routable: false, discoverable: false`
- `visibility: "unlisted"` → `visibility: "unlisted", routable: true, discoverable: false`
- `visibility: "public"` or a `publishAt` that has passed → `visibility: "public", routable: true, discoverable: true`
- Otherwise the strategy decides. `explicit` publishes only `publish: true`; `selective` publishes unless `private: true` or `draft: true` is set.

`visibility: "public"` is an explicit override: it publishes the note even when the `explicit` strategy would otherwise require `publish: true`.

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
