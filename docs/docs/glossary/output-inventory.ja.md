---
date: 2026-10-14
title: 出力一覧（Output Inventory）
sidebar:
  hidden: true
---
# 出力一覧（Output Inventory）

パスをキーにした、すべての生成物の記録です。公開エントリ、リダイレクト、プラグインページ、生成物から作られ、ビルドはこれを前回の記録と比較して、影響を受ける出力、変わらない出力、削除された出力を求めます。

## 含まれるもの

ビルドが所有するすべての出力を一覧にします。コンテンツ出力、リダイレクト出力、プラグインページ出力、生成物が含まれ、現在のビルドでどの出力を描画し、再利用し、削除するかを決めます。

## 出力の構成

### コンテンツ出力

`manifest.publicEntries` から生成されます。各コンテンツ出力は次のとおりです。
- `kind`: `"content"`
- `path`: permalinkから解決されたHTML出力パス
- `producer`: `content:${slug}`
- `dependencies`: `[{ type: "content", slug: "<entry-slug>" }]` に加え、プラグインが宣言した出力依存関係

### リダイレクト出力

`manifest.publicRedirects` から生成されます。各リダイレクト出力は次のとおりです。
- `kind`: `"redirect"`
- `path`: リダイレクト先のHTMLパス
- `producer`: `content:${redirect.slug}:redirect`
- `dependencies`: `[{ type: "content", slug: redirect.slug }]`

### プラグインページ出力

プラグインページの定義（`pageTypes`）から生成されます。各プラグインページ出力は次のとおりです。
- `kind`: `"plugin-page"`
- `path`: HTML出力パス
- `producer`: `plugin:${plugin.name}`
- `dependencies`: `pageTypes[].outputDependencies` または `context.output.emit(..., { dependencies })` で宣言

### 生成物

プラグインが `manifest.generatedOutputs` を通じて生成します。各生成物は次のとおりです。
- `kind`: `"generated"`
- `path`: 出力パス
- `producer`: `plugin:${output.owner}`
- `dependencies`: `context.output.emit(..., { dependencies })` で宣言。`content`、`tag`、`folder`、`global`、`unknown` の種類を含む

## 比較

前回成功した状態と比較して、影響を受ける出力、変わらない出力、削除された出力を求めます。ビルドログには `SSG outputs` の行で `rendered`、`reused`、`removed` の件数が出ます。

## 関連用語

- [[build|Build]]
- [[ssg|SSG]]
- [[glossary/build-dependency|Build Dependency]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
