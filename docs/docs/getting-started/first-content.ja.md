---
date: 2026-10-08
title: 最初のコンテンツ
sidebar:
  label: 最初のコンテンツ
  order: 30
---
# 最初のコンテンツ

このページでは、Markdown をサイトに表示する方法を説明します。`starter` プリセットが生成したサンプルを編集しても、新しいファイルを作っても構いません。

## コンテンツを置く場所

生成されたサイトは、既定では `content/` の Markdown を読み込みます。

```text
my-site/
├─ content/
│  ├─ index.md
│  ├─ guide.en.md
│  ├─ examples.en.md
│  └─ notes/
│     ├─ planning.md
│     └─ writing.md
├─ riebeckite.config.ts
└─ package.json
```

`starter` プリセットでは、最初からサンプルのコンテンツが生成されます。編集が機能することを確かめるだけなら、新しいページを作らず、まずこれらのファイルを編集してください。

既定では公開は明示的です。frontmatter に `publish: true` がある Markdown だけがサイトに表示されます。

## サンプルを編集して表示を確認する

ローカルのプレビューが起動していなければ、開発サーバーを起動します。

```bash
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL をブラウザで開きます。次に `content/notes/writing.md` や `content/index.md` を編集して保存してください。ブラウザに変更した文章が表示されれば、Markdown の編集は機能しています。

## 最小のページを新しく作る

`content/first-post.md` を作ります。

```md
---
title: First post
publish: true
---

Hello from Riebeckite.
```

`title` はページのタイトルです。`publish: true` は、そのページを公開対象にする指定です。ファイル名は URL の一部になります。`content/first-post.md` は `/first-post` で表示され、`index` 系のファイルはその階層のトップページになります。

本文は通常の Markdown で書けます。`starter` プリセットには Obsidian 風の Markdown サポートも含まれているため、生成されたサンプルノートでは `[[planning]]` のような WikiLink も使えます。

frontmatter、下書き、画像、内部リンクの詳しい書き方は [Writing Content](../guides/writing-content.ja.md) を参照してください。

## ビルドして公開用ファイルを出力する

```bash
npm exec riebeckite build
```

ビルドに成功すると、公開用のファイルが `dist/` に作られます。

ページが表示されないときは、まず開発サーバーが起動しているか、ファイルを保存したか、frontmatter に `publish: true` があるかを確認してください。さらに詳しく調べる場合は、[CLI リファレンス](../reference/cli.ja.md) の `inspect content --list` や `doctor` を使います。

## 次に読むページ

- [プリセット →](./presets.ja.md)
- [デプロイ →](./deployment.ja.md)
