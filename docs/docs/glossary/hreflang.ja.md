---
date: 2026-10-14
title: Hreflang
sidebar:
  hidden: true
---

# Hreflang

あるページの言語違いのURLを検索エンジンに伝えるlinkメタデータです。Riebeckiteはノートに存在する翻訳からこれを生成します。

## 出力

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

## 翻訳から生成

リンクはノートのtranslationから作るため、言語版を追加すればその代替リンクも自動で加わります。

## hreflangの生成
Riebeckiteはl10nプラグインの`addLocalizationHeadTags`関数(`packages/plugins/l10n/src/l10n.ts`)を通じて`hreflang`linkメタデータを生成します。翻訳関係があるノートについて、存在する各翻訳言語に対して1つ`<link rel="alternate" hreflang="…">`をemitします。これらのheadタグはmanifest作成中にノートの`entry.headTags`に追加され、サイトシェルによってページの`<head>`で描画されます。

hreflang形式はBCP 47に準拠し、`en`, `ja`, `en-US`, `zh-CN`などの言語タグを使用します。href値は各言語バージョンの解決されたpermalinkで、resolved configの`buildPostUrl`を使用して構築されます。

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

これは[[seo|SEO plugin]]と組み合わせて、検索エンジン最適化のための言語代替を提供します。
