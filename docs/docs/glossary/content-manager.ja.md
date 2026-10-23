---
date: 2026-10-14
title: ContentManager（コンテンツマネージャー）
sidebar:
  hidden: true
---

# ContentManager（コンテンツマネージャー）

走査済みのエントリを完成したマニフェストに変えるコンポーネントです。公開先を解決し、Markdownとプラグインのパイプラインを実行し、コンテンツグラフとクエリ用のインデックスを構築します。

## 責務

- 各エントリの公開先を解決する。
- 各エントリにMarkdownとプラグインのパイプラインを実行する。
- コンテンツグラフとコンテンツインデックスを構築する。
- マニフェストを組み立て、診断を集める。

## 処理の順序

公開先の解決を最初に行うため、後続のフックとページは安定したパーマリンクを前提にできます。その後で処理、グラフの順に進み、最後にマニフェストを確定します。

## 行わないこと

ContentManagerはファイルを読みません。それはContentSourceの役割です。

## ContentManagerの型

`ContentManager`クラス（`packages/core/src/content/content_manager.ts`）は中核となるオーケストレーターです。主なメソッドは次のとおりです。

- **`getManifest()`** — すべての公開先を解決し、プラグインのパイプラインを実行し、コンテンツグラフを構築して、完全な`ContentManifest`を組み立てて返す
- **`getContentLocations()`** — 各slugを解決済みの公開先（slug、permalink、リダイレクト、メタデータ）へ対応付ける`ReadonlyMap<string, ContentPublicLocation>`を返す
- **`getContentGraph()`** — 被リンク・発リンク・隣接リンクを問い合わせる`ContentGraph`を返す
- **`getBacklinks(targetSlug)`** — 指定したエントリへのバックリンクを返す
- **`inspect()`** — エントリ、コンテンツインデックス、診断を持つ`ContentInspection`を返す
- **`getPagePaths()`**と**`getPageRoutes()`** — 宣言されたプラグインページのパスとルートを返す

`getManifest()`で見えるマニフェストエントリの抜粋例：

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

ContentManagerは内部で次のコンポーネントを調整します。

- **`ContentIndexBuilder`**（`packages/core/src/content/content_index_builder.ts`）— slugの異形と曖昧さを解決する
- **`ContentLocationResolver`** — プラグインが調整したパスを含む公開先を解決する
- **`PluginRuntime`**（`packages/core/src/plugin/plugin_runtime.ts`）— プラグインのフック（onContentLoaded、extendContentGraph、onManifestCreatedなど）を実行する
- **`ContentBuildCoordinator`** — 増分ビルドの状態と出力の変更検知を管理する

## 関連用語

- [[glossary/content|Content]]
- [[content-entry|Content Entry]]
- [[content-index|Content Index]]
- [[content-source|Content Source]]
- [[glossary/pipeline|Pipeline]]
