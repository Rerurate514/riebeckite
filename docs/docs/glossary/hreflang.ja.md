---
date: 2026-10-14
title: hreflang（言語別URLの宣言）
sidebar.hidden: true
---

# hreflang（言語別URLの宣言）

あるページの言語違いの URL を検索エンジンに伝える link メタデータです。Riebeckite はノートに存在する翻訳からこれを生成します。

## 出力

```html
<link rel='alternate' hreflang='en' href='/docs/hello/'>
<link rel='alternate' hreflang='ja' href='/ja/docs/hello/'>
<link rel='alternate' hreflang='x-default' href='/docs/hello/'>
```

head タグの href には、各翻訳の解決済みパーマリンクをサイトルートからの相対パスで指定します。

## 翻訳から生成

リンクはノートの翻訳から作られるため、言語版を追加すればその代替リンクも自動的に加わります。翻訳グループに複数の言語がある場合は、既定言語のページを指す `hreflang="x-default"` のリンクも1つ出力します。

## hreflangの生成
Riebeckite は l10n プラグインの `addLocalizationHeadTags` 関数（`packages/plugins/l10n/src/head_tags.ts`。`l10n.ts` のマニフェスト作成時に呼ばれます）を通じて `hreflang` の link メタデータを生成します。翻訳の関係を持つノートについて、存在する翻訳言語ごとに1つの `<link rel="alternate" hreflang="…">` を出力します。これらの head タグはマニフェストの作成中にノートの `entry.headTags` へ追加され、サイトのシェルがページの `<head>` 内に描画します。

hreflang の形式は BCP 47に従い、`en`、`ja`、`en-US`、`zh-CN` などの言語タグのほか、既定言語ページを表す予約値 `x-default` を使います。

これは [SEO プラグイン](../plugins/seo.ja.md) と組み合わせて、検索エンジン最適化のための言語別の代替 URL を提供します。
