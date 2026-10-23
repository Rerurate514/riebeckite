---
date: 2026-10-14
title: コンテンツグラフ（Content Graph）
sidebar:
  hidden: true
---

# コンテンツグラフ（Content Graph）

解決済みのWikiLinkとMarkdownリンクから作られる、コンテンツエントリ間の関係の網です。どのノートがどれにリンクしているかに答え、バックリンクや近傍の問い合わせに使います。

## 辺

解決済みのWikiLinkやMarkdownリンクは、参照元のエントリから参照先への有向の辺を作ります。埋め込みも辺を作り、依存関係として追跡されます。

## 問い合わせ

```ts
graph.outgoing(slug);   // entries this note links to
graph.incoming(slug);   // backlinks
graph.neighbors(slug);  // both directions
```

## リンクに基づく辺の解決

コンテンツグラフは、コンテンツマニフェストの`outgoingLinks`と`incomingLinks`のマップにある解決済みリンクから有向の辺を構築します。SSGのビルド中は次のようになります。

- **WikiLink** `[[page]]`や`[[page#heading]]`は、`kind: "note"`と対象の`slug`を持つ解決済みのノートリンクを生成し、参照元のエントリから参照先のエントリへの**発リンク**の辺を作ります。
- **Markdownリンク**は参照元のslugを基準に解決されます。パスが既知のコンテンツslugと一致すれば、参照元からその参照先への発リンクの辺が作られます。
- **未解決のリンク**（外部URL、添付ファイルの参照）は`kind: "unresolved"`として記録され、グラフの辺を作りません。そのため`outgoing`、`incoming`、`neighbors`の問い合わせには現れません。

`createContentGraph`関数は、こうしたリンク由来の辺を問い合わせ可能なグラフにまとめ、バックリンクの表示や関連リンクのセクション向けに`graph.outgoing(slug)`、`graph.incoming(slug)`、`graph.neighbors(slug)`の検索を可能にします。

## `extendContentGraph`による拡張

プラグインは`extendContentGraph`を実装することで、Coreを変更せずに独自の関係を追加できます。コールバックは`PluginGraphContext`を受け取り、マニフェストの`outgoingLinks`や`incomingLinks`のマップへリンク参照を追加できます。プラグインが追加した辺は`createContentGraph`の呼び出し時に自動的に含まれ、「関連記事」、被引用グラフ、目次の相互参照といった機能を実現できます。

```ts
// Example plugin adding a "cites" relationship
context.extendContentGraph?.({
  pluginName: "my-plugin",
  outgoing: {
    "post-a": ["post-b", "post-c"], // post-a cites post-b and post-c
  },
});
```

結果のグラフの`outgoing`、`incoming`、`neighbors`の問い合わせには、Coreが解決した辺とプラグインが提供した辺の両方が含まれます。

## コンテンツグラフのAPI

`ContentGraph`型（`packages/core/src/content/content_graph.ts`）は次の問い合わせメソッドを提供します。

- **`graph.outgoing(slug)`** — `slug`のノートがリンクしているエントリ（発リンクの辺）を返す
- **`graph.incoming(slug)`** — `slug`のノートへのバックリンクを返す
- **`graph.neighbors(slug)`** — `slug`のノートへリンクしている、またはそこからリンクされているエントリ（両方向）を返す
- **`graph.outgoingSlugs(slug)`** — 発リンク先のslugだけを返す
- **`graph.incomingSlugs(slug)`** — 被リンク元のslugだけを返す
- **`graph.neighborSlugs(slug)`** — 隣接ノードのslugだけを返す

これらはマニフェストの`outgoingLinks`と`incomingLinks`のマップから`createContentGraph`が構築します。
