# Localization

Riebeckite の多言語対応は `@riebeckite/plugin-l10n` が担当します。`starter` 以上の preset では、7言語（`en`, `ja`, `zh-CN`, `es`, `de`, `fr`, `ko`）で設定されます。

## 基本設定

```ts
import { l10n } from "@riebeckite/plugin-l10n"

export default defineConfig({
  plugins: [
    l10n({
      defaultLang: "en",
      languages: ["en", "ja"],
    }),
  ],
})
```

## 言語の判定

言語は次の順で判定されます。

1. frontmatter
2. カスタム detector
3. ファイル名
4. ディレクトリ名
5. `defaultLang`

ファイル名で分ける場合は、`README.md` と `README_ja.md` のように `_ja` を付ける形式が扱いやすいです。

## 翻訳の対応付け

同じ内容の別言語版は、frontmatter の `translation` でまとめます。

```md
---
title: こんにちは
publish: true
lang: ja
translation: hello
---
```

同じ `translation` を持つページが言語切り替えの候補になります。存在しない翻訳ページを自動生成する fallback はありません。

## URL とリンク

l10n plugin はページの言語情報を見て URL とリンクを扱います。SEO plugin と組み合わせると `hreflang` も出力できます。

詳しい option は package README と [Plugin API](../reference/plugin-api.md) を参照してください。


