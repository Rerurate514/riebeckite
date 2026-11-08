---
date: 2026-10-07
title: Comments（コメント）
---
# Comments（コメント）

公開ノートにコメントスレッドを表示するプラグインです。[Reactions](./reactions.ja.md) と組み合わせると、Zenn/Qiita風に軽いリアクションと本格コメントを分けられます。

[English](./comments.md)

## できること

- ノートごとに著者・投稿日時・本文つきのコメント一覧を表示
- ローカルプレビュー用の `MemoryCommentsProvider` を同梱
- `CommentsProvider` インターフェースで GitHub Discussions（Giscus経由）などに接続

## クイックスタート

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments } from "@riebeckite/plugin-comments";

export default defineConfig({
  plugins: [comments()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | `MemoryCommentsProvider` | コメントの保存・実行層。 |
| `headingText` | `string` | `"Comments"` | セクションの見出し。 |
| `className` | `string` | `"rr-comments"` | ルート要素に付く追加CSSクラス。 |
| `limit` | `number` | `20` | 1ノートに表示するコメントの上限。 |
| `emptyText` | `string` | `"No comments yet."` | コメントがないときの文言。 |

## 関連

- [Reactions](./reactions.ja.md) — 軽い絵文字リアクション
- [Webmention](./webmention.ja.md) — サイトをまたいだメンション
- [プラグインカタログ](./README.ja.md)
