---
date: 2026-10-14
title: 下書き（Draft）
sidebar:
  hidden: true
---

# 下書き（Draft）

公開の判定によって公開サイトから外されるコンテンツです。下書きも処理はできますが、公開されるまでルーティング対象と検出可能のビューから除外されます。

## 設定

```yaml
---
publish: false
---
```

既定の `explicit` 戦略では `publish: true` を付けないか `publish: false` にします。`selective` では `private: true`、`draft: true`、または `visibility: draft` を設定します。

## それでも起きること

下書きも解析と内部リンクの対象になるため、プレビューや相互参照ができます。公開されるまで公開出力は生成されません。

## 公開状態

下書きは `PublishingVisibility` の値の1つです（`packages/core/src/content/publishing.ts`）。ノートに `publish: false`、`private: true`、`draft: true`、または `visibility: draft` があると、有効な戦略に応じて `resolvePublishingState` は `routable: false, discoverable: false` を返します。つまり：

- ノートは `publicEntries` と `byRoutablePermalink` から除外されます
- 公開出力を生成しません
- プレビューのために解析し、内部リンクを張ることはできます
- 公開後に既存のコンテンツとリンクが保たれるよう、`entries` マニフェスト全体には残ります

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
};
```
