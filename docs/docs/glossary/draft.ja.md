---
title: Draft
sidebar:
  hidden: true
---

# Draft

公開の判定によって公開サイトから外されるコンテンツです。処理自体は続けられますが、公開されるまでroutableとdiscoverableのビューから除外されます。

## 設定

```yaml
---
published: false
---
```

## それでも起きること

draftも解析と内部リンクの対象になるため、プレビューや相互参照ができます。publishされるまで公開の出力は作りません。

## 公開状態

draftは`PublishingVisibility`の一つです（`packages/core/src/content/publishing.ts`）。`published: false`または`visibility: draft`が設定されている場合、`resolvePublishingState`は`routable: false, discoverable: false`を返します。つまり：

- ノートは`publicEntries`や`byRoutablePermalink`から除外されます
- 何らかの公開出力も生成されません
- プレビュー目的で内部リンクを引くことはできます
- 公開された後も既存のコンテンツやリンクが保持されるよう、`entries`マニフェスト全体には残ります

```ts
// From packages/core/src/content/publishing.ts
export type PublishingVisibility = "public" | "unlisted" | "draft" | "scheduled";
export type ResolvedPublishingState = {
  visibility: PublishingVisibility;
  routable: boolean;
  discoverable: boolean;
};
```
