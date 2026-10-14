---
title: Translation
sidebar:
  hidden: true
---

# Translation

同じコンテンツの言語違いを結び付ける対応で、frontmatterで設定します。翻訳の対応があることで、リンクとgraphが読み手の言語に従えます。

## 設定

```yaml
---
translation: getting-started
lang: ja
---
```

## リンクの書き換え

読み手の言語の翻訳がある場合、そのノートへのリンクとWikiLinkはその版へ解決します。翻訳が無ければ、元の対象のままです。

## 翻訳とpublic location
各コンテンツエントリの言語とpermalinkは、l10nプラグインのpublic locationシステムを通じて解決されます、`packages/plugins/l10n/src/l10n.ts`で定義されています。manifest entryの`publicLocation`には、そのエントリの言語に対する解決された`permalink`と`language`が含まれています。同じ`translation`値で設定された翻訳の場合、プラグインはエントリをまとめてそれぞれに言語固有のURLを割り当てます。

`getLocalization`関数(`packages/plugins/l10n/src/l10n.ts`)は、与えられたtranslationグループのすべての言語バージョンを解決し、`availableLanguages`と各言語の`permalink`を返します。`getLocalizedContent`関数はコンテンツエントリの特定の言語版を解決し、翻訳が存在しない場合はmanifest entryを返すか`null`を返します。

```ts
import { getLocalizedContent } from "@riebeckite/plugin-l10n";
const entry = getLocalizedContent(manifest, "getting-started", "ja");
```

 ```ts
import { getLocalizedContent } from "@riebeckite/plugin-l10n";
const entry = getLocalizedContent(manifest, "getting-started", "ja");
```
