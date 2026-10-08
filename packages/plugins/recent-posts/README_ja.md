# @riebeckite/plugin-recent-posts

公開済みノートを日付順に並べ、最新の記事一覧として表示するプラグインです。

[English](./README.md)

## できること

`getRecentPosts()` は `manifest.discoverableEntries` を読み、unlisted・draft・予約公開のノートと `index` ノートを除き、`frontmatter.date`、なければ `created` を基準に新しい順へ並べます。日付を解釈できないノートは一覧から外れます。`RecentPosts` は結果が空なら何も描画しません。公式の `starter` と `showcase` は、ホームページ route で一覧を本文の後に明示的に配置します。

## 設定と配置

```ts
import { defineConfig } from "@riebeckite/core";
import { recentPostsPlugin } from "@riebeckite/plugin-recent-posts";

export default defineConfig({ plugins: [recentPostsPlugin()] });
```

`recentPostsPlugin()` は UI を自動描画しません。生成された `starter` と `showcase` は推奨するホームページ配置を実装しています。独自の配置では、アプリ側で表示位置を決めます。

```tsx
import { RecentPosts, getRecentPosts } from "@riebeckite/plugin-recent-posts";
import { content } from "virtual:riebeckite/content";

const posts = getRecentPosts({ manifest: await content.getManifest() });
return <RecentPosts posts={posts} />;
```

生成されたホームページの一覧を無効にするには、`RecentPosts` の import と `afterContent` prop を削除します。位置を変える場合は、同じ要素を既存の route または layout の目的の slot へ移動します。

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

- [プラグインシステム](../../../docs/docs/reference/plugin-api.ja.md)
