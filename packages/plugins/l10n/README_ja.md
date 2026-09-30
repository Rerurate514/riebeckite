# @riebeckite/plugin-l10n

Riebeckite の Markdown コンテンツをローカライズするプラグインです。UI 文言の翻訳は担当しませんが、標準の言語切替 UI を提供します。

[English](./README.md)

## 基本設定

```ts
import { l10n } from "@riebeckite/plugin-l10n";

l10n({ defaultLang: "ja", languages: ["ja", "en", "zh-CN"] });
```

## ロケール検出と翻訳グループ

ファイル名はこのリポジトリの慣例に合わせ、アンダースコアの `README_ja.md` 形式を推奨します。`README.ja.md`、`README-ja.md`、`README.en.md`、`README.en-US.md`、`README.zh-CN.md` も利用できます。設定済みの言語名に一致する先頭ディレクトリ（`en/README.md`）も検出します。

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

テーマは `getLocalization(manifest, slug)` から現在の言語、存在する言語、各翻訳の href を取得できます。`getLocalizedContent()` は翻訳がなければ `null` を返します。

## 標準 LanguageSwitcher

`l10n(...)` は標準記事レイアウトの `article.after-meta` スロットへ、組み込みの LanguageSwitcher を登録します。標準 Site consumer がこのスロットを描画するため、l10n 専用の記事レイアウト実装は不要です。実在する翻訳が 2 つ未満のページには表示されません。

```ts
// URL とメタデータは維持し、UI だけを無効化します。
l10n({ defaultLang: "ja", languages: ["ja", "en"], ui: false });

// 配置の変更、またはサーバー描画コンポーネントの置換。
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  ui: {
    slot: "article.footer",
    render: ({ localization }) => `<p>${localization.lang}</p>`,
  },
});
```

Theme は `.l10n-switcher` の CSS class を上書きできます。`ui.render` はフレームワーク非依存の HTML renderer なので、カスタム Site は任意のサーバー描画コンポーネントへ置き換えられます。

各ページには実在する翻訳だけを対象に `hreflang` の alternate link を追加します。WikiLink の Content Graph は同言語の翻訳を優先し、なければ元のリンク先を使います。本文の WikiLink と Markdown リンクも、現在のページと同じ言語の翻訳があればその URL に切り替えます。クエリ文字列とフラグメントは維持し、翻訳がないリンク、外部 URL、コンテンツ以外の URL は変更しません。

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

## ????

- [?????????](../../../docs/ja/plugin-system.md)
