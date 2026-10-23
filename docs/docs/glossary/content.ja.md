---
date: 2026-10-14
title: Content
sidebar:
  hidden: true
---

# Content

Markdownの解析とPluginの処理を経たコンテンツです。frontmatter、描画済みのHTML、解決済みの公開位置を持ちます。Riebeckiteは生のファイルではなく、処理を終えたこの単位を扱います。

## ファイルではなく処理後の項目

Riebeckiteはファイルを読み取り、解析し、Pluginのパイプラインに通してから、サイト上の公開位置を解決します。以降に扱うのはcontentです。Content Entry、公開位置、関連のすべてがここに含まれます。

contentを問い合わせるコードは、ファイルシステムではなくmanifestを読みます。

## contentがたどる流れ

1. Content Sourceがファイルを見つけて読み取ります。
2. Content Managerが解析し、パイプラインを実行します。
3. 公開位置の解決がpermalinkを割り当てます。
4. 項目はContent Entryとしてmanifestに記録されます。

## コンテンツ処理モジュール

Riebeckiteのcontent pipelineは、それぞれ責任を持った明確なモジュールで構成されています：

- **`content_manager.ts`** (`packages/core/src/content/content_manager.ts`) ：全体的なbuildフローをオーケストレーションします。対象はコンテンツソースのスキャン、content indexの構築、場所の解決、`Pipeline`によるpluginパイプラインの実行です。manifestとcontent graphの構築、incremental build stateのコミットも行います。plugin runtime、content index builder、build coordinatorと調整します。

- **`content_collection.ts`** (`packages/core/src/content/content_collection.ts`) ：`ContentCollectionDefinition`、`ContentCollection`を定義し、pagination、sort、filterをサポートし、manifestエントリをタグ/日付/フォルダベースのリストにグループ化する`buildContentCollections`関数を提供します。

- **`content_graph.ts`** (`packages/core/src/content/content_graph.ts`) ：`ContentGraph`タイプとしてcontent graphを表現し、ノード、incoming/outgoingリンク、neighborsをクエリするメソッドを持ちます。manifestの`outgoingLinks`と`incomingLinks`から`runGraphHook`のदौरान構築されます。

- **`content_index_builder.ts`** (`packages/core/src/content/content_index_builder.ts`) ：スラッグバリアント（大文字小文字無視やaliasマッピング含む）をそのcanonical slugにマップするcontent resolution indexを構築します。`resolveContentIndex`を使用して候補を単一の解決に収束させ、診断用のambiguitiesをフラグ付けします。

## manifestのentry

manifestに登録される各コンテンツentryは`ContentManifestEntry`(`packages/core/src/types/content_manifest.ts`)で型付けされています。主なフィールドは以下の通りです：

- **`slug`** ：内部的な検索キー
- **`permalink`** ：解決済みの正canonicalな公開URL
- **`publicLocation`** ：slug、permalink、任意のredirects、メタデータを組み合わせたもの
- **`contentId`** ：frontmatterに書かれた安定した著者による識別子で、slug/permalinkとは独立して生存します
- **`frontmatter`** ：`PostFrontmatter`。`id`、`title`、`description`、`date`、`published`、`tags`ほかのメタデータを保持します
- **`html`** ：処理後のMarkdown HTML本文
- **`aliases`** ：ノートの別キー
- **`tags`** および**`links`** ：タクソノミーとwikilink/MMDリンク

例）entryの構造:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  contentId: "abc123",
  frontmatter: {
    id: "abc123",
    title: "Hello World",
    tags: ["intro"],
  },
  html: "<p>Hello world</p>",
  tags: ["intro"],
  links: [],
  backlinks: [],
  assets: [],
}
```

## 関連用語

- [[content-source|Content Source]]
- [[content-entry|Content Entry]]
- [[permalink|Permalink]]
- [[manifest|Manifest]]
- [[content-graph|Content Graph]]
- [[taxonomy|Taxonomy]]
- [[series|Series]]
