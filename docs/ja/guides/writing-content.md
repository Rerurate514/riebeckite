# 記事の書き方ガイド

Riebeckite で公開する記事の基本的な書き方をまとめたガイドです。Markdown に慣れていない人でも、最初の記事を書けるところまでを扱います。

## 記事ファイルを置く場所

標準では、記事は `content/` フォルダに置きます。

```text
my-site/
└─ content/
   ├─ index.md
   └─ first-post.md
```

`first-post.md` は `/first-post` で表示されます。`index.md` はトップページとして扱いやすい名前です。

## 最小の記事

公開する記事には、先頭に frontmatter を書きます。

```md
---
title: 最初の記事
publish: true
---

# 最初の記事

本文を書きます。
```

- `title`: サイト上で使う記事タイトル
- `publish: true`: 公開する印

`publish: true` がないファイルは、下書きとして扱えます。

## よく使う Markdown

```md
# 大見出し

## 中見出し

本文です。空行を入れると段落が分かれます。

- 箇条書き
- もう1つ

[外部リンク](https://example.com)

![画像の説明](/images/photo.jpg)
```

## ファイル名と URL

ファイル名は URL の一部になります。

|ファイル|URL|
|---|---|
|`content/index.md`|`/`|
|`content/about.md`|`/about`|
|`content/posts/first.md`|`/posts/first`|

URL を分かりやすくしたい場合は、英小文字・数字・ハイフンでファイル名を付けるのがおすすめです。

## 公開する記事と下書きを分ける

公開する記事:

```md
---
title: 公開する記事
publish: true
---
```

下書き:

```md
---
title: まだ出さない記事
---
```

下書きはビルドしても公開ページになりません。

## 内部リンクと画像

通常の Markdown リンクを使えます。

```md
[プロフィール](/about)
```

Obsidian 形式の WikiLink も、対応する Plugin を使っている構成なら使えます。

```md
[[about]]
[[about|プロフィール]]
```

画像は記事の近くに置くと管理しやすいです。

```text
content/
├─ first-post.md
└─ images/
   └─ photo.jpg
```

```md
![写真](/images/photo.jpg)
```

## 公開前に確認する

```sh
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite dev
```

ブラウザで確認し、問題なければビルドします。

```sh
npm exec riebeckite build
```

## 次に読むもの

- [サイト公開までの最短ガイド](../getting-started/deployment.md)
- [Obsidian のノートをサイトにするガイド](./obsidian.md)
- [Configuration](../reference/configuration.md)
