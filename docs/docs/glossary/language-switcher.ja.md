---
title: Language Switcher
sidebar:
  hidden: true
---

# Language Switcher

読み手がページの言語版を行き来できるようにする操作です。`l10n`がコンポーネントとデータhelperを公開します。

## どこから来るか

`<LanguageSwitcher />`は`@riebeckite/plugin-l10n`が公開するサーバー描画コンポーネントです。サイトの好きな場所へ描画します。`SiteProvider`と、publicな`entry`を持つ`Article`の内側では、`getLocalization(manifest, slug)`を自分で解決します。

## 現れる条件

現在のページにtranslationが1つ以上あるときだけ現れます。翻訳版のないページにはswitcherが出ません。実際に存在する翻訳のみが候補となり、欠落している言語のためのフォールバックページは生成されません。

## UIカスタマイズ

デフォルトではスタイル付きの言語リンクリストを描画します。サイト独自のコンポーネントに置き換えたり、データを明示的に渡したりできます。

```tsx
import { LanguageSwitcher, getLocalization } from "@riebeckite/plugin-l10n";

const localization = getLocalization(manifest, entry.slug);
<LanguageSwitcher localization={localization} />;
```

テーマは`.rr-l10n-switcher`を通じてデフォルトをスタイルできます。
