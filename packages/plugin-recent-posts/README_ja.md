# @riebeckite/plugin-recent-posts

最近の投稿 list 描画: frontmatter の日付順で最新の published note を表示します。

[English](./README_en.md)

## 概要

`recentPosts()` は最近投稿された記事の ordered list を描画する
`RecentPosts` component を提供します。`getRecentPosts()` は unpublished note
を除外し、frontmatter から日付を取り出し（`date`、無ければ `created`）、
新しい順にソートして `limit` 件に切り詰めます。日付が parse できない
note は除外します。

投稿が 0 件の場合は component は何も描画しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";

export default defineConfig({
  // ...
  plugins: [recentPostsPlugin()],
});
```

`recentPostsPlugin()` は plugin list に plugin を登録し、`style.css` を app の
stylesheet に bundle します。

### Component の描画

```tsx
import RecentPosts, { getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { config } from "../config";
import { content } from "../content";
import { getArticleTitle } from "../lib/article-title";

const posts = await content.getAllPosts();
const recentPosts = await getRecentPosts({
  posts,
  config,
  getProcessedContent: (slug) => content.getProcessedContent(slug),
  resolveTitle: getArticleTitle,
  limit: 5,
});

// route 内で
return <Article afterContent={<RecentPosts posts={recentPosts} />} />;
```

`getRecentPosts()` は投稿を集める前に `index` note を除外します。

## Component

`RecentPosts({ posts })` は eyebrow label と ordered list を持つ
`<section class="recent-posts">` を描画します。各 item は投稿への link と、
`ja-JP` locale で format した日付を表示します。

## オプション

| オプション | 型 | デフォルト | 説明 |
| ---------- | -- | ---------- | ---- |
| `limit` | `number` | `5` | 返す投稿の最大件数 |

## エクスポート

- `recentPostsPlugin()` — plugin factory
- `RecentPosts` — list component（`components/recent-posts.tsx` の
  default export）
- `getRecentPosts({ posts, config, getProcessedContent, resolveTitle, limit? })`
  — 最新の published posts を収集
- 型: `RecentPost`（`{ slug, title, postedAt }`）

## 関連

- [Plugin ガイド](../../docs/plugins_jp.md)