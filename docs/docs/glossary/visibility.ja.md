---
date: 2026-10-14
title: 公開範囲（Visibility）
sidebar:
  hidden: true
---

# 公開範囲（Visibility）

公開したページの見せ方を調整するfrontmatterフィールドです。ページを下書きにせず、一覧に載せるページと非公開（unlisted）のページを分けます。

## 値

| 値 | URLでの提供 | 一覧への掲載 |
| --- | --- | --- |
| listed（既定） | あり | あり |
| unlisted | あり | なし |

## publishedとの違い

`visibility` は見せ方を調整し、`published` はページを公開するかどうか自体を決めます。[非公開（unlisted）](./unlisted.md)のページは公開されていますが、一覧からは外れます。

## 公開状態との統合

frontmatterの `visibility` フィールドは、`resolvePublishingState`（`packages/core/src/content/publishing.ts`）への入力の1つです。公開戦略と `published` フィールドとともに、最終的な `ResolvedPublishingState` を決めます。

- `visibility: "listed"`（既定）＋ `published: true` → `visibility: "public", routable: true, discoverable: true`
- `visibility: "unlisted"` ＋ `published: true` → `visibility: "unlisted", routable: true, discoverable: false`
- `visibility: "public"` または `visibility: "unlisted"` で `published: false` → `visibility: "draft", routable: false, discoverable: false`

つまり `visibility` は公開済みのページが一覧に載るかを制御し、`published` はそもそも公開するかを制御します。

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
