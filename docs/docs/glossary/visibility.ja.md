---
date: 2026-10-14
title: 公開範囲（Visibility）
sidebar:
  hidden: true
---

# 公開範囲（Visibility）

公開したページの見せ方を調整する frontmatter フィールドです。一覧に載せるページと unlisted のページを分けたり、下書きのまま固定したりします。

## 値

| 値 | URL での提供 | 一覧への掲載 |
| --- | --- | --- |
| public（既定） | あり | あり |
| unlisted | あり | なし |
| draft | なし | なし |

`visibility` が受け付けるのは `public`、`unlisted`、`draft` だけです。それ以外の値はビルドを失敗させます。

## publish との違い

`visibility` は見せ方を調整します。ページを公開するかどうか自体は、公開戦略と `publish`、`private`、`draft` の各 frontmatter で決まります。`published` は日付フィールドであり、公開スイッチではありません。

## 公開状態との統合

`resolvePublishingState`（`packages/core/src/content/publishing.ts`）は `visibility`、`publishAt`、設定された公開戦略を組み合わせます。

- `visibility: "draft"` → `visibility: "draft", routable: false, discoverable: false`
- `publishAt` が未来 → `visibility: "scheduled", routable: false, discoverable: false`
- `visibility: "unlisted"` → `visibility: "unlisted", routable: true, discoverable: false`
- `visibility: "public"`、または `publishAt` を過ぎている → `visibility: "public", routable: true, discoverable: true`
- それ以外は公開戦略で決まります。`explicit` は `publish: true` のときだけ公開し、`selective` は `private: true` または `draft: true` が無ければ公開します。

`visibility: "public"` は明示的な上書きです。`explicit` 戦略で通常は `publish: true` が必要な場合でも、そのノートを公開します。

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
