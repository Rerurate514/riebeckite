---
date: 2026-10-14
title: WikiLink
sidebar:
  hidden: true
---

# WikiLink

ノート同士をつなぎ、content graphに関係を作る`[[link]]`記法です。Riebeckiteはcontent indexを通して解決し、解決できないリンクはdiagnosticとして残します。

## 記法

```md
[[target]]              # 名前でリンク
[[target|label]]        # ラベル付きでリンク
[[target#Heading]]      # 見出しへリンク
[[glossary/theme]]      # 曖昧な名前は明示パス
```

## 解決

対象は小文字化したうえでcontent indexから引きます。一致すればgraphの辺を作り、見つからなければ壊れたリンクとして描画し、diagnosticで報告します。

## エイリアスとcontent indexによる解決

Wikilinkの解決は`ContentManifest`の`contentIndex`（`packages/core/src/types/content_manifest.ts`）を通じて行われます。indexはすべてのキーをsmall文字化して構築されます。`byAlias`に登録されたエイリアスも解決の際に参照されるため、slugやpermalinkを変えずにエイリアスからノートへリンクできます。同じエイリアスキーを複数のエントリが主張する場合、そのキーは曖昧になり、`contentIndexAmbiguities`に診断が報告されます。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  contentIndex: Map<string, string>; // lowercase key → slug
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
  byAlias: Map<string, ContentManifestEntry[]>;
}
```

WikiLinkの`[[Target]]`は、まず小文字化した`"target"`について`contentIndex`を検索し、一意に一致すればそのノートへリンクします。キーが曖昧な場合は解決に失敗し、diagnosticが出力されます。見つからない場合はリンクのまま残り、解決できないリンクとしてdiagnosticが出力されます。
