---
date: 2026-10-14
title: 翻訳（Translation）
sidebar:
  hidden: true
---

# 翻訳（Translation）

同じコンテンツの言語違いを結び付ける対応で、frontmatterで設定します。翻訳があることで、リンクとグラフが読み手の言語に従えます。

## 設定

```yaml
---
translation: getting-started
lang: ja
---
```

## リンクの書き換え

読み手の言語の翻訳がある場合、そのノートへのリンクと[WikiLink](./wikilink.md)はその版へ解決されます。翻訳がなければ、元の対象のままです。

## 翻訳と公開先
各コンテンツエントリの言語とpermalinkは、l10nプラグインの公開先システムを通じて解決され、`packages/plugins/l10n/src/l10n.ts` で定義されています。マニフェストエントリの `publicLocation` には、そのエントリの言語に対する解決済みの `permalink` と `language` が含まれます。同じ `translation` 値で翻訳が設定されていると、プラグインはエントリをグループ化し、それぞれに言語固有のURLを割り当てます。

`getLocalization` 関数（`packages/plugins/l10n/src/l10n.ts`）は、指定した翻訳グループのすべての言語版を解決し、`availableLanguages` と各言語の `permalink` を返します。`getLocalizedContent` 関数はコンテンツエントリの特定の言語版を解決し、マニフェストエントリを返します。翻訳が存在しない場合は `null` を返します。

```ts
import { getLocalizedContent } from "@riebeckite/plugin-l10n";
const entry = getLocalizedContent(manifest, "getting-started", "ja");
```

これにより、リンク、コンテンツグラフ、言語スイッチャーが確立された翻訳関係に従います。
