---
title: Body slot
sidebar:
  hidden: true
---

# Body slot

Pluginは`appendContentBodySlot`で、記事レイアウトの名前付きの位置にHTMLの断片を追加できます。slotは依存関係を解決したPluginの順序で積み上がり、どのslotをどこに描画するかはサイトが選びます。

## 標準スロット

Coreは`article.header`、`article.metadata`、`article.aside`、`article.before-content`、`article.after-content`、`article.footer`を`ContentBodySlot`として定義します。独自のslot名も使えます。

```ts
appendContentBodySlot(entry, "article.after-content", "<section>...</section>");
```

## 描画

サイトは`entry.bodySlots`を読み、選んだslotを描画します。slotは`@riebeckite/honox/ui`の`ContentSlot`プリミティブで描画できます。

## 関連用語

- [[plugin|Plugin]]
- [[island|Island]]
- [[content-hook|Content hook]]
- [[glossary/diagnostics|Diagnostics]]

## さらに詳しく

- [Plugin API](../reference/plugin-api.ja.md)
- [Theme System](../framework/theme-system.ja.md)
