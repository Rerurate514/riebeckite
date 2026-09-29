# @riebeckite/plugin-l10n

Riebeckite の Markdown コンテンツをローカライズするプラグインです。UI 文言の翻訳や言語切替 UI は担当しません。

[English](./README.md)

## 基本設定

```ts
import { l10n } from "@riebeckite/plugin-l10n";

l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] });
```

## ロケール検出と翻訳グループ

ファイル名は `README.en.md` を推奨します。`README-en.md`、`README_en.md`、`README.en-US.md`、`README.zh-CN.md` も利用できます。設定済みの言語名に一致する先頭ディレクトリ（`en/README.md`）も検出します。

frontmatter も利用できます。

```md
---
lang: en
translation: getting-started
---
```

組み合わせた場合の組み込み規則の優先順位は **frontmatter > ファイル名 > ディレクトリ > 既定言語** です。矛盾は `L10N_LANGUAGE_CONFLICT`、同一 `translation + lang` の重複は `L10N_DUPLICATE_TRANSLATION` として診断します。`strict: true` ではビルドを失敗させます。

`translation` はロケール検出とは別です。異なるパス・ファイル名でも明示的な ID でグループ化できます。翻訳がない言語のページを複製・生成することはありません。

## URL・テーマ・SEO

既定言語は既存の URL（`/about`）、その他は言語プレフィックス付き（`/en/about`）です。既存の Content Location を拡張するため、別の URL 解決プラグインとも併用できます。翻訳ごとに URL を変える場合は、異なるソースパスまたは permalink プラグインを使います。

テーマは `getLocalization(manifest, slug)` から現在の言語、存在する言語、各翻訳の href を取得できます。`getLocalizedContent()` は翻訳がなければ `null` を返します。言語切替 UI はテーマ側で実装してください。

各ページには実在する翻訳だけを対象に `hreflang` の alternate link を追加します。WikiLink の Content Graph は同言語の翻訳を優先し、なければ元のリンク先を使います。通常の Markdown リンクは記述された URL を維持します。

## 独自検出

```ts
l10n({
  defaultLang: "ja",
  languages: ["ja", "en", "fr"],
  detect: ({ path }) =>
    path.startsWith("French/") ? { lang: "fr", translationId: "hello" } : undefined,
});
```

独自検出の言語は frontmatter より弱く、ファイル名・ディレクトリより強く扱われます。`translationId` は明示的な翻訳グループ ID です。
