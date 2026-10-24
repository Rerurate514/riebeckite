---
date: 2026-10-08
title: Docs
---
# Docs

Riebeckite の Markdown コンテンツから、Docs 用のサイドバーと前後ページリンクを
ビルド時に生成するプラグインです。Docs 専用のルーターは追加せず、公開 URL も
ファイルシステムのパスから再計算しません。

[English](./docs.md)

## インストール

```sh
pnpm add @riebeckite/plugin-docs
```

## 基本設定

```ts
import { defineConfig } from "@riebeckite/core";
import { docs } from "@riebeckite/plugin-docs";

export default defineConfig({
  plugins: [
    docs({
      root: "docs",
      sidebar: { auto: true },
      prevNext: true,
    }),
  ],
});
```

`root` は Docs として扱うコンテンツサブツリーです。`root: "docs"` の場合、
`content/docs/` 配下だけが対象になり、`notes/` や `blog/` には Docs の UI を出しません。

## frontmatter

```yaml
---
title: Installation
sidebar:
  label: Install
  order: 2
  hidden: false
  collapsed: false
---
```

対応するメタデータは次のとおりです。

- `label`: ナビゲーションに表示する名前。未指定なら `title`、さらに未指定ならファイル名。
- `order`: 明示的な並び順。指定のない項目は、`order` を持つ項目の後に、タイトル、パスの順で並びます。
- `hidden`: サイドバーと前後ページリンクから除外します。
- `collapsed`: Theme やクライアント側の拡張で使えるよう、`data-docs-collapsed` として出力します。

これらのフィールドはすべて任意です。`sidebar` frontmatter のないページも
ナビゲーションに表示されます。階層はフォルダ構造に従い、ラベルは `title`、
並び順はタイトル順になります。`sidebar` は Riebeckite 独自の拡張であり、サイト
設定ではなくコンテンツ側に置きます。上書きしたいフィールドだけを指定し、それ
以外は Vault に手を入れないでください。

## 出力と Theme の統合

プラグインは、サイトへ組み込むための React 風の JSX コンポーネントを提供します。

- `<DocsSidebar items={...} currentPermalink? label? />` は `details.rb-docs-sidebar-details` と `nav.rb-docs-sidebar` を描画
- `<DocsPrevNext previous? next? />` は `nav.rb-docs-prev-next` を描画

クライアント側の `initDocsSidebar` を使うと、サイドバーを折りたためます。

## l10n と公開の境界

`@riebeckite/plugin-l10n` のメタデータがある場合、現在の言語に対応する項目だけで
ナビゲーションを作ります。URL はマニフェストの解決済みパーマリンクをそのまま使うため、
パーマリンク、エイリアス、リネーム、l10n の扱いはコンテンツ側の責務のままです。

公開対象の項目だけを含めます。draft、private、excluded、hidden、root 外のコンテンツは
サイドバーと前後ページリンクに表示されません。

## エクスポート

- `docs(options)` / `docs(options)`: プラグインファクトリ
- `buildDocsNavigation(entries, options)`: フレームワークに依存しないナビゲーションモデル
- `flattenDocsNavigation(items)`: 前後ページリンク用の並び
- `renderDocsSidebar(...)` / `renderDocsPrevNext(...)`: サーバー側の HTML レンダラー
- `initDocsSidebar()`: 畳めるサイドバーのブラウザ側初期化（`@riebeckite/plugin-docs/client` からも読み込める）
- 型: `DocsOptions`、`ResolvedDocsOptions`、`DocsNavigationItem`
