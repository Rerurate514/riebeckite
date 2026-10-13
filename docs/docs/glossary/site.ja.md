---
title: Site
sidebar:
  hidden: true
---

# Site

サイト アプリケーション がルート、ドキュメントフレーム、メタデータ、HTML セーフティを所有します。 @riebeckite/honox 統合 を通じて Riebeckite コアの動作を HonoX と Vite に接続し、 plugin の貢献が最終的なパブリック UI にどのように composition されるかを決定します。

## アプリケーション構成

サイトにはこれらのソースディレクトリがあります (integration、theme、plugin ではありません):

```text
app/routes/       — URL ハンドリング、ページ構成、リダイレクト、レスポンスメタデータ
app/components/ — パブリック UI プリミティブの構成再利用可能なサイトプレゼンテーション
app/islands/      — オプションのインタラクティブ UI とそのクライアントサイドステート
app/style.css     — ビジュアルトークン、レイアウト、タイポグラフィ、生成された拡張スタイルのインポート
```

## ルート解決

ルートリゾルバ (`resolveRiebeckiteContentRequest`) は順にコンテンツ、plugin ページ、リダイレクト、not-found を解決します。

 プラグインは情報と UI フラグメントを提供します; サイト はそれらがどこでレンダリングされるかを決定します。

## head と slot のハンドオフ

 プラグインは `headTags` / `bodySlots` だけを記述します; サイト がレンダリングを所有します。

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
