# @riebeckite/plugin-docs

Riebeckite の Markdown content から Docs 用の sidebar と previous/next を
build-time に生成する Plugin です。Docs 専用 router は追加せず、公開 URL も
filesystem path から再計算しません。

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

`root` は Docs として扱う content subtree です。`root: "docs"` の場合、
`content/docs/` 配下だけが対象になり、`notes/` や `blog/` には Docs UI を出しません。

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

対応する metadata は次の通りです。

- `label`: navigation に表示する名前。未指定なら `title`、さらに未指定なら filename。
- `order`: 明示的な並び順。未指定 item は明示 order の後で title/path 順に並びます。
- `hidden`: sidebar と previous/next から除外します。
- `collapsed`: Theme や client enhancement 用に `data-docs-collapsed` として出力します。

## Theme との統合

Plugin は既存の汎用 article body slot に HTML fragment を提供します。

- `article.aside`: Docs sidebar
- `article.footer`: previous/next navigation

CSS は最小限の構造だけです。Theme 側では `rb-docs-sidebar`、
`aria-current="page"`、`data-docs-level`、`data-docs-collapsed`、
`data-docs-previous`、`data-docs-next` などを hook として使えます。

## l10n / publish boundary

`@riebeckite/plugin-l10n` の metadata がある場合、現在の言語に対応する entry だけで
navigation を作ります。URL は manifest の resolved permalink をそのまま使うため、
permalink / alias / rename / l10n の責務を壊しません。

公開対象の entry だけを含めます。draft、private、excluded、hidden、root 外の content は
sidebar / previous-next に出ません。

## Exports

- `docs(options)` / `docsPlugin(options)`: plugin factory
- `buildDocsNavigation(entries, options)`: framework-independent navigation model
- `flattenDocsNavigation(items)`: previous/next 用 sequence
- `renderDocsSidebar(...)` / `renderDocsPrevNext(...)`: server HTML renderer
- Types: `DocsOptions`, `ResolvedDocsOptions`, `DocsNavigationItem`
