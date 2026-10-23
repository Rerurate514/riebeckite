---
date: 2026-10-14
title: hreflang（言語別URLの宣言）
sidebar:
  hidden: true
---

# hreflang（言語別URLの宣言）

あるページの言語違いのURLを検索エンジンに伝えるlinkメタデータです。Riebeckiteはノートに存在する翻訳からこれを生成します。

## 出力

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

## 翻訳から生成

リンクはノートの翻訳から作られるため、言語版を追加すればその代替リンクも自動的に加わります。

## hreflangの生成
Riebeckiteはl10nプラグインの`addLocalizationHeadTags`関数（`packages/plugins/l10n/src/l10n.ts`）を通じて`hreflang`のlinkメタデータを生成します。翻訳の関係を持つノートについて、存在する翻訳言語ごとに1つの`<link rel="alternate" hreflang="…">`を出力します。これらのheadタグはマニフェストの作成中にノートの`entry.headTags`へ追加され、サイトのシェルがページの`<head>`内に描画します。

hreflangの形式はBCP 47に従い、`en`、`ja`、`en-US`、`zh-CN`などの言語タグを使います。hrefの値は各言語版の解決済みパーマリンクで、解決済みの設定の`buildPostUrl`を使って構築します。

```html
<link rel='alternate' hreflang='en' href='https://example.com/docs/hello/'>
<link rel='alternate' hreflang='ja' href='https://example.com/ja/docs/hello/'>
```

これは[[seo|SEOプラグイン]]と組み合わせて、検索エンジン最適化のための言語別の代替URLを提供します。
