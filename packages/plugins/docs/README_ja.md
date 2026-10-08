# @riebeckite/plugin-docs

<!-- Generated from docs/docs/plugins/docs.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckite の Markdown コンテンツから、Docs 用のサイドバーと前後ページリンクを
ビルド時に生成するプラグインです。Docs 専用の router は追加せず、公開 URL も
ファイルシステムのパスから再計算しません。

[English](./README.md)

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

## Frontmatter

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

対応するメタデータは次の通りです。

- `label`: ナビゲーションに表示する名前。未指定なら `title`、さらに未指定ならファイル名。
- `order`: 明示的な並び順。未指定の項目は明示された order のあとを title、path の順に並びます。
- `hidden`: サイドバーと前後ページリンクから除外します。
- `collapsed`: Theme やクライアント側の拡張のために `data-docs-collapsed` として出力します。

## Theme との統合

Plugin は既存の汎用 article body slot に HTML フラグメントを提供します。

- `article.aside`: Docs のサイドバー
- `article.footer`: 前後ページリンクのナビゲーション

CSS は最小限の構造だけです。Theme 側では `rb-docs-sidebar`、
`aria-current="page"`、`data-docs-level`、`data-docs-collapsed`、
`data-docs-previous`、`data-docs-next` などをフックとして使えます。

## l10n と公開の境界

`@riebeckite/plugin-l10n` のメタデータがある場合、現在の言語に対応する項目だけで
ナビゲーションを作ります。URL は manifest の解決済み permalink をそのまま使うため、
permalink / alias / rename / l10n の責務を壊しません。

公開対象の項目だけを含めます。draft、private、excluded、hidden、root 外のコンテンツは
サイドバーと前後ページリンクに出ません。

## エクスポート

- `docs(options)` / `docsPlugin(options)`: プラグインファクトリ
- `buildDocsNavigation(entries, options)`: フレームワークに依存しないナビゲーションモデル
- `flattenDocsNavigation(items)`: 前後ページリンク用の並び
- `renderDocsSidebar(...)` / `renderDocsPrevNext(...)`: サーバー側の HTML レンダラー
- 型: `DocsOptions`、`ResolvedDocsOptions`、`DocsNavigationItem`
