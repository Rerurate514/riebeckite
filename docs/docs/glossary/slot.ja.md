---
title: Body slot
sidebar:
  hidden: true
---

# Body slot

プラグインは `appendContentBodySlot` で記事レイアウトの名前付き位置に HTML フラグメントを寄せられます; slot は resolved plugin order で蓄積し、site は 各スロットを描画するかどうか、どこで描画するかを選択します。

## 標準スロット

Core は slot names を `ContentBodySlot` として定義します: `article.header`、`article.metadata`、`article.aside`、`article.before-content`、`article.after-content`、`article.footer`. 独自の slot name も受け入れます。

```ts
appendContentBodySlot(entry, "article.after-content", "<section>...</section>");
```

## 描画

site は `entry.bodySlots` を読み、選択したスロットを描画します。slot は `@riebeckite/honox/ui` の `ContentSlot` プリミティブを使用して描画できます。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Theme System](../framework/theme-system.ja.md)
