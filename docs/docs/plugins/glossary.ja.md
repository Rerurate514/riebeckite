---
date: 2026-10-24
title: Glossary
---
# Glossary

[English](./glossary.md)

`glossary: true` を付けた公開ノートから、用語集ページを生成します。各用語ページへの
参照には、通常の Markdown リンクまたは Obsidian の WikiLink を使います。

## インストール

```bash
pnpm add @riebeckite/plugin-glossary
```

## 使い方

```ts
import { glossary } from "@riebeckite/plugin-glossary";

export default {
  plugins: [glossary()],
};
```

```md
---
title: 静的サイト生成
glossary: true
term: SSG
definition: デプロイ前に HTML を生成する方式です。
---
```

`/glossary` に、`term` のアルファベット順で一覧を生成します。`term` がなければ
ノートの title を使います。`definition` は任意です。公開一覧に載せられるノートだけが
対象です。プラグインには、有効なテーマの色と書体トークンを使うレスポンシブな用語集
スタイルが含まれます。

## 実行例

[Glossary を開く](/glossary)

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `basePath` | `string` | `"/glossary"` | 生成ページのパス。空文字列で無効化します。 |
| `key` | `string` | `"glossary"` | 対象を選ぶ真偽値の frontmatter キー。 |
| `termKey` | `string` | `"term"` | 表示する用語の frontmatter キー。 |
| `definitionKey` | `string` | `"definition"` | 任意の短い定義のキー。 |
| `title` | `string` | `"Glossary"` | ページ見出しと title。 |
| `className` | `string` | `"rb-glossary"` | ルート CSS クラス。 |
