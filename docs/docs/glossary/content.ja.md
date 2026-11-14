---
date: 2026-10-14
title: コンテンツ（Content）
sidebar.hidden: true
---

# コンテンツ（Content）

Markdown の解析とプラグインの処理を経たコンテンツ項目です。frontmatter、描画済みの HTML、解決済みの公開先を持ちます。Riebeckite は生のファイルではなく、処理済みの項目を扱います。

## ファイルではなく処理済みの項目

Riebeckite はファイルを読み取り、解析し、プラグインのパイプラインに通してから、サイト上の公開先を解決します。それ以降に扱うのはすべてコンテンツです。エントリ、その公開先、関係が含まれます。

コンテンツを問い合わせるコードは、ファイルシステムではなくマニフェストを読みます。

## コンテンツ項目の流れ

1. コンテンツソースがファイルを見つけて読み取ります。
2. コンテンツマネージャーが解析し、パイプラインを実行します。
3. 公開先の解決がパーマリンクを割り当てます。
4. 項目はコンテンツエントリとしてマニフェストに記録されます。

## コンテンツ処理のモジュール

Riebeckite のコンテンツパイプラインは、役割を絞った複数のモジュールで構成されています。

- **`content_manager.ts`**（`packages/core/src/content/content_manager.ts`）— ビルドフロー全体を調整します。コンテンツソースの走査、コンテンツインデックスの構築、公開先の解決、`Pipeline` の実行、マニフェストとグラフの構築、増分ビルド状態のコミットを行います。プラグインの実行環境、インデックスのビルダー、ビルドコーディネーターの間を調整します。

- **`content_collection.ts`**（`packages/core/src/content/content_collection.ts`）— `ContentCollectionDefinition`、`ContentCollection`、および `buildContentCollections` 関数を定義します。マニフェストのエントリをタクソノミー、日付、フォルダーの一覧にまとめ、ページネーション、並べ替え、フィルターに対応します。

- **`content_graph.ts`**（`packages/core/src/content/content_graph.ts`）— コンテンツグラフを `ContentGraph` 型として表し、ノード、被リンク・発リンク、隣接ノードを問い合わせるメソッドを持ちます。マニフェストの `outgoingLinks` と `incomingLinks` から、`runGraphHook` の実行中に構築されます。

- **`content_index_builder.ts`**（`packages/core/src/content/content_index_builder.ts`）— slug の異形（大文字小文字の違いやエイリアスを含む）を正規の slug に対応付けるインデックスを構築します。`resolveContentIndex` が候補を 1 つの解決にまとめ、曖昧なものは診断用に記録します。

## コンテンツマニフェストのエントリ

マニフェストの各エントリは `ContentManifestEntry`（`packages/core/src/types/content_manifest.ts`）で型付けされています。主なフィールドは次のとおりです。

- **`slug`** — 内部的な検索キー
- **`permalink`** — 解決済みの正規の公開 URL
- **`publicLocation`** — slug、permalink、任意のリダイレクト、メタデータを組み合わせたもの
- **`contentId`** — frontmatter に著者が書く安定した識別子。slug / permalink とは独立
- **`frontmatter`** — `PostFrontmatter`。`id`、`title`、`description`、`date`、`published`、`tags` などのメタデータを含む
- **`html`** — 処理済みの Markdown HTML 本文
- **`aliases`** — ノートの代替の検索キー
- **`tags`** と **`links`** — 処理中に収集したタクソノミーと WikiLink / MMD リンク

エントリ構造の例：

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
