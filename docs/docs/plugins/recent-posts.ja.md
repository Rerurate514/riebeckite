<!-- Generated from packages/plugins/recent-posts/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Recent Posts

公開済みノートを日付順に並べ、最新の記事一覧として表示するプラグインです。

[English](./recent-posts.md)

## できること

`getRecentPosts()` は `manifest.discoverableEntries` を読み、unlisted・draft・予約公開のノートと `index` ノートを除き、`frontmatter.date`、なければ `created` を基準に新しい順へ並べます。日付を解釈できないノートは一覧から外れます。`RecentPosts` は結果が空なら何も描画しません。一覧を置くかどうか、どこへ置くかは Site 側で決めます。

## 設定と配置

```ts
import { defineConfig } from "@riebeckite/core";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";

export default defineConfig({ plugins: [recentPostsPlugin()] });
```

一覧を置く場所はアプリ側で決めます。

```tsx
import RecentPosts, { getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "../content";

const posts = getRecentPosts({ manifest: await content.getManifest() });
return <Article afterContent={<RecentPosts posts={posts} />} />;
```

| オプション | 既定値 | 内容 |
| --- | --- | --- |
| `manifest` | 必須 | 候補ノートの取得元（`discoverableEntries`） |
| `limit` | `5` | 返す記事数の上限 |

## 公開 API

- `recentPostsPlugin()` — プラグインファクトリ
- `RecentPosts` — 最新記事一覧コンポーネント
- `getRecentPosts({ manifest, limit? })`
- `RecentPost` — `{ slug, permalink, title, postedAt }` の型

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
