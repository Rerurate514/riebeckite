---
title: First Content
sidebar:
  label: First Content
  order: 30
---
# First Content

Markdown をサイトに表示する方法を確認します。`starter` preset が生成したサンプルを編集しても、新しいファイルを作っても構いません。

## content の場所

生成されたサイトは、既定では `content/` の Markdown を読み込みます。

```text
my-site/
├─ content/
│  ├─ index.en.md
│  ├─ guide.en.md
│  ├─ examples.en.md
│  └─ notes/
│     ├─ planning.md
│     └─ writing.md
├─ riebeckite.config.ts
└─ package.json
```

`starter` preset では、最初からサンプル content が生成されます。新しいファイルを作らなくても、まずはこれらの Markdown を編集して動作を確認できます。

既定では、frontmatter に `publish: true` がある Markdown だけが公開対象になります。

## 既存サンプルを編集する

まだ起動していなければ、ローカル確認用のサーバーを起動します。

```bash
npm exec riebeckite dev
```

ターミナルに表示されたローカル URL をブラウザで開きます。次に `content/notes/writing.md` や `content/index.en.md` を編集して保存してください。ブラウザに変更した文章が表示されれば成功です。

## 最小のページを作る

`content/first-post.md` を作ります。

```md
---
title: First post
publish: true
---

Hello from Riebeckite.
```

`title` はページのタイトルです。`publish: true` は、そのページを公開対象にする指定です。通常、`content/first-post.md` は `/first-post` として表示されます。`index` 系のファイルは、その階層のトップページになります。

本文は通常の Markdown で書けます。`starter` preset には Obsidian 風の Markdown support も含まれているため、生成されたサンプルノートでは `[[planning]]` のような WikiLink も使えます。

frontmatter、下書き、画像、内部リンクの詳しい書き方は [Writing Content](../guides/writing-content.md) を参照してください。

## ビルドする

```bash
npm exec riebeckite build
```

成功すると、公開用のファイルが `dist/` に作られます。

ページが表示されないときは、まず開発サーバーが起動しているか、ファイルを保存したか、frontmatter に `publish: true` があるかを確認してください。さらに詳しく調べる場合は、[CLI reference](../reference/cli.md) の `inspect content --list` や `doctor` を使います。

## 次に読むページ

- [Presets →](./presets.md)
- [Deployment →](./deployment.md)
