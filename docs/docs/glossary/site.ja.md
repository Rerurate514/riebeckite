---
title: Site
sidebar:
  hidden: true
---

# Site

サイトのapplicationは、route、文書の枠組み、メタデータ、HTMLの安全性を持ちます。`@riebeckite/honox`のintegrationを通じてRiebeckiteのCoreの振る舞いをHonoXとViteにつなぎ、Pluginの提供物を最終的な公開UIにどう組み立てるかを決めます。

## Applicationの構成

サイトは次のソースディレクトリを持ちます（integration、Theme、Pluginには含まれません）。

```text
app/routes/       — URL の処理、ページの構成、redirect、レスポンスのメタデータ
app/components/ — 公開 UI プリミティブの再利用可能な表示と構成
app/islands/      — 任意の対話的 UI とそのクライアント側の状態
app/style.css     — 視覚的なトークン、レイアウト、タイポグラフィ、生成された拡張スタイルの読み込み
```

## Routeの解決

routeのresolver（`resolveRiebeckiteContentRequest`）が、content、Pluginページ、redirect、not-foundを順に解決します。

Pluginは情報とUIの断片を提供し、どこに描画するかはサイトが決めます。

## Headとslotの受け渡し

Pluginは`headTags` / `bodySlots`を記述するだけです。描画はサイトが持ちます。

```tsx
<PluginHeadTags tags={headTagsFromManifest} />
```

```tsx
<ContentSlot slots={bodySlots} name="article.header" />
```

## 関連用語

- [[glossary/obsidian-vault|Obsidian Vault]]
- [[tag|Tag]]
- [[shortcode|Shortcode]]
- [[callout|Callout]]
- [[sidenote|Sidenote]]
- [[backlink|Backlink]]
- [[glossary/ui|UI]]

## さらに詳しく

- [HonoX Site](../framework/honox-integration/site.ja.md)
