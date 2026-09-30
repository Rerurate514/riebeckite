# First Content

Riebeckite は `content/` に置いた Markdown を読み込みます。既定では `publish: true` が付いたファイルだけが公開されます。

## 最小の記事

`content/first-post.md` を作ります。

```md
---
title: First post
publish: true
---

Hello from Riebeckite.
```

通常、`content/first-post.md` は `/first-post` として公開されます。`index.md` は `/` になります。

## 確認する

```bash
npm exec riebeckite inspect content --list
npm exec riebeckite inspect graph
npm exec riebeckite check
npm exec riebeckite dev
```

ローカルで確認できたらビルドします。

```bash
npm exec riebeckite build
npm exec riebeckite build --full
```

書き方の詳細は [Writing Content](../guides/writing-content.md)、Obsidian Vault を使う場合は [Obsidian](../guides/obsidian.md) を参照してください。
