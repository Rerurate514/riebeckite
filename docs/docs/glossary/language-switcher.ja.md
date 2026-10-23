---
date: 2026-10-14
title: 言語スイッチャー（Language Switcher）
sidebar:
  hidden: true
---

# 言語スイッチャー（Language Switcher）

読み手がページの言語版を行き来するための操作要素です。`l10n` がコンポーネントとデータヘルパーを公開します。

## どこから来るか

`<LanguageSwitcher />` は `@riebeckite/plugin-l10n` が公開するサーバー描画コンポーネントです。サイト内の好きな場所に描画できます。`SiteProvider` の内側で、公開用の `entry` を持つ `Article` があれば、コンポーネント自身が `getLocalization(manifest, slug)` を解決します。

## 表示される条件

現在のページに翻訳が1つ以上ある場合にだけ表示されます。翻訳版の兄弟ページがないページでは、スイッチャーは表示されません。候補になるのは実際に存在する翻訳だけで、存在しない言語のフォールバックページは生成されません。

## UIのカスタマイズ

既定ではスタイル付きの言語リンク一覧を描画します。サイト独自のコンポーネントに置き換えることも、データを明示的に渡すこともできます。

```tsx
import { LanguageSwitcher, getLocalization } from "@riebeckite/plugin-l10n";

const localization = getLocalization(manifest, entry.slug);
<LanguageSwitcher localization={localization} />;
```

テーマは `.rr-l10n-switcher` を通じて既定の見た目を変更できます。
