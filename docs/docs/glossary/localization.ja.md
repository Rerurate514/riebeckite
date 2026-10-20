---
title: Localization
sidebar:
  hidden: true
---

# Localization

1つのサイトで複数の言語のコンテンツを配信できるようにするl10n Pluginです。ノートの言語を検出し、翻訳をまとめ、言語切り替えを公開します。

## 言語の検出

1. frontmatterの`lang`field。
2. 設定したdetect関数。
3. `.ja.md`のようなファイル名の接尾辞。
4. 設定した既定言語。

## 追加するもの

- ノートの各言語版をtranslationとしてまとめます。
- language switcherを公開します。
- 既定以外の言語を`/ja/`のようにURLへ付けます。

## l10nオプションreference
l10nプラグインは`packages/plugins/l10n/src/l10n.ts`で定義される以下のオプションを受け付けます：

| Option | 目的 |
| --- | --- |
| `defaultLang` | 接頭辞なしのURLを維持する言語。Required。`languages`に含まれている必要があります。 |
| `languages` | 認識された言語。これだけがlocaleとして扱われます。 |
| `strict` | 言語の競合や重複翻訳をビルド失敗にします。 |
| `detect` | カスタム検出：`{ lang, translationId }` を返す、または `undefined` を返します。 |

```ts
import { l10n } from "@riebeckite/plugin-l10n";
export default defineConfig({
  plugins: [l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] })],
);
```

フルオプションリストと実装ノートは[plugin README](../plugins/l10n.ja.md)を参照してください。

## headタグの生成
l10nプラグインは、ノートの各翻訳バージョンに対する`hreflang`linkタグを生成します。これらは`addLocalizationHeadTags`関数（`packages/plugins/l10n/src/l10n.ts`で定義）を通じて、manifest作成中にノートの`headTags`に追加されます。各翻訳エントリは、存在する各翻訳に対して1つ`<link rel="alternate" hreflang="…">`を受け取ります。サイトシェルはそれらのタグを描画し、`<html lang>`をリクエストに対して選択します。

これは[[seo|SEO plugin]]と組み合わせて、言語の代替バージョンのSEOのためのhreflangをemitします。
