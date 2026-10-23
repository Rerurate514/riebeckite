---
date: 2026-10-14
title: 非公開（unlisted）
sidebar:
  hidden: true
---

# 非公開（unlisted）

URLでは提供しつつ、一覧やフィードには載せない公開状態です。ルーティング対象だが検出可能ではないため、共有リンクや下書きに近いページに向きます。

## 設定

```yaml
---
visibility: unlisted
---
```

## 効果

ページは[ルーティング対象](./routable.md)のままで出力も作りますが、[検出可能](./discoverable.md)ビューから外れるため、一覧やフィードには載りません。

## 公開状態

非公開（unlisted）は `PublishingVisibility` の値の1つです（`packages/core/src/content/publishing.ts`）。frontmatterで `visibility: unlisted` を設定すると、`resolvePublishingState` は `routable: true, discoverable: false` を返します。つまり次のようになります。

- ページはURLで提供され、出力も生成される
- `discoverableEntries` ビューから除外される
- 一覧、フィード、タクソノミーのタームページには表示されない
- 直接のURLやWikiLinkからは参照できる

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
};
```

## 下書きとの関係

`draft` のvisibilityとは異なり、非公開（unlisted）のページは公開済みかつルーティング対象とみなされます。下書き（`published: false` または `visibility: draft`）はルーティングから完全に除外され、公開されるまで公開出力を作りません。
