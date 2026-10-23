---
date: 2026-10-14
title: Visibility
sidebar:
  hidden: true
---

# Visibility

公開したページをどう見せるかを細かく決めるfrontmatterのfieldです。ページを下書きにせず、一覧に載せるかどうかを分けます。

## 値

| 値 | URLでの提供 | 一覧への掲載 |
| --- | --- | --- |
| listed（既定） | あり | あり |
| unlisted | あり | なし |

## publishedとの違い

`visibility`は見せ方を調整し、`published`は公開するかどうか自体を決めます。unlistedのページは公開されていますが、一覧からは外れます。

## 公開状態との統合

frontmatterの`visibility`fieldは`resolvePublishingState`（`packages/core/src/content/publishing.ts`）の入力の一つです。publish strategyと`published`フィールドとともに、`ResolvedPublishingState`を決定します：

- `visibility: "listed"`（既定）+`published: true`→ `visibility: "public", routable: true, discoverable: true`
- `visibility: "unlisted"`+`published: true`→ `visibility: "unlisted", routable: true, discoverable: false`
- `visibility: "public"`または`visibility: "unlisted"`で`published: false`→ `visibility: "draft", routable: false, discoverable: false`

つまり`visibility`はページが一覧に表示されるかどうかを制御し、`published`は公開されているかどうかを制御します。

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
