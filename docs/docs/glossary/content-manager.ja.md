---
date: 2026-10-14
title: Content Manager
sidebar:
  hidden: true
---

# Content Manager

走査済みのentryを完成したmanifestに変えるコンポーネントです。公開位置を解決し、MarkdownとPluginのパイプラインを実行してから、content graphと検索用のindexを作ります。

## 責務

- 各entryの公開位置を解決します。
- 各entryにMarkdownとPluginのパイプラインを実行します。
- content graphとcontent indexを作ります。
- manifestを組み立て、diagnosticを集めます。

## 処理の順序

公開位置の解決を先に行うため、後続のhookとページは安定したpermalinkを前提にできます。その後で処理、graphの順に進み、最後にmanifestを確定します。

## 行わないこと

Content Managerはファイルを読みません。読み取りはContent Sourceの役割です。

## ContentManagerの型

`ContentManager`クラス(`packages/core/src/content/content_manager.ts`)は核心的なオーケストレータです。主なメソッドは以下の通りです：

- **`getManifest()`** ：全ての場所解決、plugin pipelineの実行、content graphの構築を終えた`ContentManifest`を構築して返します
- **`getContentLocations()`** ：各slugを解決済みの公開位置（slug, permalink, redirects, メタデータ）へマップする`ReadonlyMap<string, ContentPublicLocation>`を返します
- **`getContentGraph()`** ：参照リンクのクエリ用の`ContentGraph`を返します
- **`getBacklinks(targetSlug)`** ：与えられたentryへのbacklinkを返します
- **`inspect()`** ：entries、content index、diagnosticsを持つ`ContentInspection`を返します
- **`getPagePaths()`および`getPageRoutes()`** ：pluginページの宣言されたパスとルートを返します

`getManifest()`で見えるmanifest entryの断片例:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  contentId: "abc123",
  frontmatter: { id: "abc123", title: "Hello", tags: [] },
  publishing: { routable: true, discoverable: true, status: "published" },
  html: "<p>Hello world</p>",
  tags: [],
  links: [],
  backlinks: [],
  assets: [],
}
```

Content Managerは以下のコンポーネントを内部で調整します：

- **`ContentIndexBuilder`** (`packages/core/src/content/content_index_builder.ts`) ：slugバリアントの解決と曖昧さの特定
- **`ContentLocationResolver`** ：公開位置の解決、plugin調整パスの対応
- **`PluginRuntime`** (`packages/core/src/plugin/plugin_runtime.ts`) ：onContentLoaded, extendContentGraph, onManifestCreatedなどのplugin hookの実行
- **`ContentBuildCoordinator`** ：インクリメンタルビルド状態とoutput変更の検知管理

## 関連用語

- [[glossary/content|Content]]
- [[content-entry|Content Entry]]
- [[content-index|Content Index]]
- [[content-source|Content Source]]
- [[glossary/pipeline|Pipeline]]
