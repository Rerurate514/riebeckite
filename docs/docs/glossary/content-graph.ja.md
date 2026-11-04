---
date: 2026-10-14
title: コンテンツグラフ（Content Graph）
sidebar:
  hidden: true
---

# コンテンツグラフ（Content Graph）

解決済みの WikiLink と Markdown リンクから作られる、コンテンツエントリ間の関係の網です。どのノートがどれにリンクしているかに答え、バックリンクや近傍の問い合わせに使います。

## 辺

解決済みの WikiLink や Markdown リンクは、参照元のエントリから参照先への有向の辺を作ります。埋め込みも辺を作り、依存関係として追跡されます。

## 問い合わせ

```ts
graph.outgoing(slug);   // entries this note links to
graph.incoming(slug);   // backlinks
graph.neighbors(slug);  // both directions
```

## リンクに基づく辺の解決

コンテンツグラフは、コンテンツマニフェストの `outgoingLinks` と `incomingLinks` のマップにある解決済みリンクから有向の辺を構築します。SSG のビルド中は次のようになります。

- **WikiLink** `[[page]]` や `[[page#heading]]` は、`kind: "note"` と対象の `slug` を持つ解決済みのノートリンクを生成し、参照元のエントリから参照先のエントリへの**発リンク**の辺を作ります。
- **Markdown リンク**は参照元の slug を基準に解決されます。パスが既知のコンテンツ slug と一致すれば、参照元からその参照先への発リンクの辺が作られます。
- **未解決のリンク**（外部 URL、添付ファイルの参照）は `kind: "unresolved"` として記録され、グラフの辺を作りません。そのため `outgoing`、`incoming`、`neighbors` の問い合わせには現れません。

`createContentGraph` 関数は、こうしたリンク由来の辺を問い合わせ可能なグラフにまとめ、バックリンクの表示や関連リンクのセクション向けに `graph.outgoing(slug)`、`graph.incoming(slug)`、`graph.neighbors(slug)` の検索を可能にします。

## `extendContentGraph`による拡張

プラグインは `definePlugin` の `extendContentGraph` を実装して関係を追加します。コールバックはマニフェストの `entries` と `contentIndex` を持つ `PluginGraphContext` を受け取り、各エントリへノートリンクを追加できます。追加したリンクは `createContentGraph` の実行時にグラフの辺となり、「関連記事」、被引用グラフ、目次の相互参照といった機能を実現できます。

```ts
import { definePlugin } from "@riebeckite/core";

export const cites = definePlugin({
  name: "my-plugin",
  extendContentGraph({ entries, contentIndex }) {
    for (const entry of entries) {
      const target = contentIndex.get("post-b");
      if (target && !entry.links.some((link) => link.slug === target)) {
        entry.links.push({ raw: "post-b", slug: target, kind: "note", embed: false });
      }
    }
  },
});
```

結果のグラフの `outgoing`、`incoming`、`neighbors` の問い合わせには、Core が解決した辺とプラグインが提供した辺の両方が含まれます。

## コンテンツグラフのAPI

`ContentGraph` 型（`packages/core/src/content/content_graph.ts`）は次の問い合わせメソッドを提供します。

- **`graph.outgoing(slug)`** — `slug` のノートがリンクしているエントリ（発リンクの辺）を返す
- **`graph.incoming(slug)`** — `slug` のノートへのバックリンクを返す
- **`graph.neighbors(slug)`** — `slug` のノートへリンクしている、またはそこからリンクされているエントリ（両方向）を返す
- **`graph.outgoingSlugs(slug)`** — 発リンク先の slug だけを返す
- **`graph.incomingSlugs(slug)`** — 被リンク元の slug だけを返す
- **`graph.neighborSlugs(slug)`** — 隣接ノードの slug だけを返す

これらはマニフェストの `outgoingLinks` と `incomingLinks` のマップから `createContentGraph` が構築します。
