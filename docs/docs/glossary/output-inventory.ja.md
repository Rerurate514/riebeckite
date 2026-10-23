---
date: 2026-10-14
title: Output Inventory
sidebar:
  hidden: true
---
# Output Inventory

公開entry、redirectから作られ、パスをキーにした生成物の記録です。Pluginページ、Generated Outputから作られ、パスをキーにした生成物の記録です。

## 含まれるもの

Buildが所有するすべての出力の一覧です。contentの出力、redirectの出力、Pluginページの出力、Generated Outputを含みます。

## 包含する出力の詳細

### contentの出力

`manifest.publicEntries`から生成されます。各content outputは:
- `kind`: `"content"`
- `path`: permalinkから導かれたHTML出力パス
- `producer`: `content:${slug}`
- `dependencies`: `[{ type: "content", slug: "<entry-slug>" }]`ほか、pluginが宣言したoutput dependencies

### リダイレクト出力

`manifest.publicRedirects`から生成されます。各redirect outputは:
- `kind`: `"redirect"`
- `path`: リダイレクト先のHTMLパス
- `producer`: `content:${redirect.slug}:redirect`
- `dependencies`: `[{ type: "content", slug: redirect.slug }]`

### Plugin Pageの出力

Plugin Pageの定義（`pageTypes`）から生成されます。各Plugin Pageの出力は：
- `kind`: `"plugin-page"`
- `path`: HTML出力パス
- `producer`: `plugin:${plugin.name}`
- `dependencies`: `pageTypes[].outputDependencies`あるいは`context.output.emit(..., { dependencies })`で宣言

### Generated Outputs

Pluginが`manifest.generatedOutputs`を通じて生成します。各生成された出力は：
- `kind`: `"generated"`
- `path`: 出力パス
- `producer`: `plugin:${output.owner}`
- `dependencies`: `context.output.emit(..., { dependencies })`で宣言。`content`、`tag`、`folder`、`global`、`unknown`のtypeを含む

## 比較

前回の成功した状態と比較、影響する出力を決めます。変わらない出力、削除された出力を決めます。ビルドログは`SSG outputs`の行で`rendered`、`reused`、`removed`の件数を報告します。

## 関連用語

- [[build|Build]]
- [[ssg|SSG]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)