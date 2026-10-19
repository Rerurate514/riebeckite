---
title: Language Switcher
sidebar:
  hidden: true
---

# Language Switcher

読み手がページの言語版を行き来できるようにする操作です。l10n Pluginが、翻訳があるときにarticle metadataのslotへ公開します。

## どこから来るか

l10n Pluginがarticle metadataのslotを通してswitcherを提供するため、どう描画しどこに置くかはサイトが決めます。

## 現れる条件

現在のページにtranslationが1つ以上あるときだけ現れます。翻訳版のないページにはswitcherが出ません。実際に存在する翻訳のみが候補となり、欠落している言語のためのフォールバックページは生成されません。

## UIカスタマイズ
l10nプラグインはarticle metadataのslotにlanguage switcherを公開します。サイトがどう描画しどこに置くかを決定します。デフォルトのUIはスタイル付きの言語リンクリストを描画しますが、完全にカスタマイズしたり無効化したりすることもできます。

```ts
// 組み込みスイッチャーを無効化、メタデータのみを保持
l10n({ defaultLang: "ja", languages: ["ja", "en"], ui: false });

// 異なるslotでスイッチャーを使用
l10n({
  defaultLang: "ja",
  languages: ["ja", "en"],
  ui: {
    slot: "article.footer",
    render: ({ localization }) => `<p>Lang: ${localization.lang}</p>`,
  },
});
```

カスタムrender関数は`LanguageSwitcherRenderContext`を受け取り、`localizedContent`を含み、任意のHTML文字列を返すことができます。slot名はswitcherが挿入されるmetadata slotを決定します。テーマは`.rr-l10n-switcher` root hookを通じてデフォルトコンポーネントをスタイルできます。
