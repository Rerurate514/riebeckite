---
date: 2026-10-14
title: 多言語化（Localization）
sidebar:
  hidden: true
---

# 多言語化（Localization）

1つのサイトで複数の言語のコンテンツを配信できるようにするl10nプラグインです。ノートの言語を検出し、翻訳をまとめ、言語スイッチャーを公開します。

## 言語の検出方法

1. frontmatterの `lang` フィールド。
2. 設定されていれば、カスタムのdetect関数。
3. `.ja.md` のようなファイル名の接尾辞。
4. 設定された既定言語。

## 追加されるもの

- ノートの各言語版を[翻訳](./translation.md)としてまとめます。
- [言語スイッチャー](./language-switcher.md)を公開します。
- 既定以外の言語には `/ja/` のようなURL接頭辞を付けます。

## l10nオプションのリファレンス
l10nプラグインは、`packages/plugins/l10n/src/l10n.ts` で定義された次のオプションを受け付けます。

| オプション | 目的 |
| --- | --- |
| `defaultLang` | 接頭辞なしのURLを使う言語。必須で、`languages` に含める必要があります。 |
| `languages` | 認識する言語。ここに挙げた言語だけがロケールとして扱われます。 |
| `strict` | 言語の競合や翻訳の重複をビルド失敗にします。 |
| `detect` | カスタム検出。`{ lang, translationId }` か `undefined` を返します。 |

```ts
import { l10n } from "@riebeckite/plugin-l10n";
export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
});
```

オプションの全一覧と実装上の注意は[プラグインのREADME](../plugins/l10n.ja.md)にあります。

## headタグの生成
l10nプラグインは、ノートの翻訳版ごとに `hreflang` リンクタグを生成します。タグはマニフェスト作成時にノートの `headTags` へ追加され、`packages/plugins/l10n/src/l10n.ts` の `addLocalizationHeadTags` 関数で定義されています。各翻訳エントリは、存在する翻訳1つにつき1つの `<link rel="alternate" hreflang="…">` を受け取ります。サイトシェルがこれらのタグを描画し、リクエストに応じて `<html lang>` を選びます。

これは[[seo|SEO plugin]]と組み合わせて動作し、SEO向けに言語の代替バージョンを出力します。
