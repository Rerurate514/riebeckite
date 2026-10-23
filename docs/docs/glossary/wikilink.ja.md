---
date: 2026-10-14
title: WikiLink（ノート間リンク）
sidebar:
  hidden: true
---

# WikiLink（ノート間リンク）

ノート同士をつなぎ、コンテンツグラフに関係を作る `[[link]]` 記法です。Riebeckiteはコンテンツインデックスを通じて解決し、解決できないリンクは診断として残します。

## 記法

```md
[[target]]              # link by name
[[target|label]]        # link with a label
[[target#Heading]]      # link to a heading
[[glossary/theme]]      # explicit path, for ambiguous names
```

## 解決

対象は小文字化したうえで[コンテンツインデックス](./content-index.md)から引きます。一致すればグラフの辺を作り、見つからなければ壊れたリンクとして描画し、診断として報告します。

## エイリアスとコンテンツインデックスによる解決

WikiLinkの解決は `ContentManifest` の `contentIndex`（`packages/core/src/types/content_manifest.ts`）を通じて行われます。インデックスは `ContentIndexBuilder` が構築し、すべてのキーを小文字化します。`byAlias` に登録されたエイリアスも参照時に解決されるため、slugやpermalinkを変えずにエイリアスからノートを指せます。複数のエントリが同じエイリアスキーを共有すると、そのキーは曖昧になり、それを使うリンクは `contentIndexAmbiguities` の診断として報告されます。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  contentIndex: Map<string, string>; // lowercase key → slug
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
  byAlias: Map<string, ContentManifestEntry[]>;
}
```

WikiLink `[[Target]]` は、まず小文字化した `"target"` で `contentIndex` を調べます。単一の一致として見つかれば、そのノートへ解決します。キーが曖昧なら解決に失敗し、診断が出ます。まったく見つからなければリンクはそのまま残り、未解決リンクとして報告されます。
