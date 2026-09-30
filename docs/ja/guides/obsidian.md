# Obsidian のノートをサイトにするガイド

Obsidian で書いている Markdown ノートを、Riebeckite の公開サイトとして使うための手順です。

## 基本の考え方

Riebeckite は、指定したフォルダの Markdown を読み込んでサイトにします。Obsidian Vault も Markdown のフォルダなので、`content.directory` に Vault の場所を指定すれば記事の置き場として使えます。

公開するかどうかは、各ノートの frontmatter で決めます。

```md
---
title: 公開する記事
publish: true
---
```

`publish: true` がないノートは公開されません。下書きや個人的なメモを同じ Vault に置いていても、公開用の印を付けたノートだけをサイトに出せます。

## パターンA: サイトの中に Vault を置く

生成したサイトの `content/` を Obsidian で開きます。

```text
my-site/
├─ content/        ← Obsidian でこのフォルダを開く
├─ riebeckite.config.ts
└─ package.json
```

設定は標準のままで動きます。

```ts
content: {
  directory: "content",
},
```

まず試すならこの形で十分です。

## パターンB: Vault とサイトを別フォルダにする

既に Obsidian Vault がある場合は、サイトと Vault を横に並べます。

```text
workspace/
├─ notes/      ← 既存の Obsidian Vault
└─ my-site/    ← Riebeckite のサイト
```

`my-site/riebeckite.config.ts` で Vault への相対パスを指定します。

```ts
content: {
  directory: "../notes",
},
```

詳しい分離運用は [記事とサイトのリポジトリ分離](./content-repositories.md) にあります。

## Obsidian 側で書くときのルール

公開したいノートの先頭に、最低限この2行を書きます。

```md
---
title: 記事のタイトル
publish: true
---
```

本文は通常の Markdown で書けます。

```md
# 見出し

本文を書きます。

[[別の記事]] へのリンクも使えます。
```

ファイル名が URL の一部になります。URL を短くしたい場合は、英数字のファイル名にすると扱いやすいです。

## 画像や添付ファイル

画像や添付ファイルは Vault の中に置きます。

```md
![写真](/images/photo.jpg)
```

Vault の外にある画像は、ビルド時に見つからないことがあります。

## 非公開メモを混ぜる

非公開にしたいノートには `publish: true` を書きません。

```md
---
title: 個人的なメモ
---
```

公開記事から非公開メモへリンクしないよう、公開前に `doctor` で確認してください。

```sh
npm exec riebeckite doctor
```

## 次に読むもの


- [記事の書き方ガイド](./writing-content.md)
- [記事とサイトのリポジトリ分離](./content-repositories.md)
- [Content System](../framework/content-system.md)
