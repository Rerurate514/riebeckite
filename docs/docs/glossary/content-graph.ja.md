---
title: Content Graph
sidebar:
  hidden: true
---

# Content Graph

解決済みのWikiLinkとMarkdownリンクから作られる、コンテンツentry間の関係の網です。どのノートがどれを参照しているかを答え、backlinkや近傍の問い合わせに使います。

## 辺

解決したWikiLinkやMarkdownリンクは、参照元のentryから参照先への有向の辺を作ります。embedも辺を作り、依存として追跡します。

## 問い合わせ

```ts
graph.outgoing(slug);   // このノートが参照する entry
graph.incoming(slug);   // backlink
graph.neighbors(slug);  // 両方向
```

## `extendContentGraph`によるプラグイン拡張

PluginはCoreを変更せずに独自の関係を追加でき、`extendContentGraph`を実装します。コールバックは`PluginGraphContext`を受け取り、manifestの`outgoingLinks`や`incomingLinks`マップに追加のリンクをプッシュできます。`createContentGraph`を呼び出した際に自動的に含まれるため、「関連投稿」「 cited-by 」グラフ、またはtable-of-contentsのcross-referenceなどの機能が可能になります。

```ts
// "cites"関係を追加するプラグインの例
context.extendContentGraph?.({
  pluginName: "my-plugin",
  outgoing: {
    "post-a": ["post-b", "post-c"], // post-a が post-b と post-c をcitationsする
  },
});

```

その結果、`outgoing`、`incoming`、`neighbors`のクエリには、Coreが解決したエッジとPluginが追加したエッジの両方が含まれます。

## リンクベースのエッジ生成

content manifestの`outgoingLinks`および`incomingLinks`マップから辺が構築されます。SSGビルド中に以下のルールでエッジが作られます：

- **WikiLinks** `[[page]]`または`[[page#heading]]`は`kind: "note"`の解決済みノートリンクを生成し、ターゲットの`slug`を持って、** outgoing** エッジをソースからターゲットへ作成します。
- **Markdownリンク** `text`はソースslugに対して相対的に正規化され、既知のcontent slugに解決された場合、outgoingエッジが作成されます。
- **未解決のリンク**（外部URL、attachment参照など）は`kind: "unresolved"`を生成し、graphエッジを作りません。

`createContentGraph`は`ContentGraphSource`を受け取り、問い合わせ可能なgraphを構築します。リンク由来のエッジを集約し、`graph.outgoing(slug)`、`graph.incoming(slug)`、`graph.neighbors(slug)`の問い合わせを可能にします。backlink表示や関連リンクセクションに使用されます。

## `extendContentGraph`によるプラグイン拡張

PluginはCoreを変更せずに独自の関係を追加でき、`extendContentGraph`を実装します。コールバックは`PluginGraphContext`を受け取り、manifestの`outgoingLinks`や`incomingLinks`マップに追加のリンクをプッシュできます。`createContentGraph`を呼び出した際に自動的に含まれるため、「関連投稿」「 cited-by 」グラフ、またはtable-of-contentsのcross-referenceなどの機能が可能になります。

```ts
// "cites"関係を追加するプラグインの例
context.extendContentGraph?.({
  pluginName: "my-plugin",
  outgoing: {
    "post-a": ["post-b", "post-c"], // post-a が post-b と post-c をcitationsする
  },
});

```

その結果、`outgoing`、`incoming`、`neighbors`のクエリには、Coreが解決したエッジとPluginが追加したエッジの両方が含まれます。

## content graphのAPI