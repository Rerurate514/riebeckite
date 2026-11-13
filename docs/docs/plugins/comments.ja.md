---
date: 2026-10-07
title: Comments（コメント）
---
# Comments（コメント）

公開ノートにコメントスレッドを表示するプラグインです。表示は Site が `CommentsSection` コンポーネントを配置して行い、プラグインはマニフェストの HTML を注入しません。[Reactions](./reactions.ja.md) と組み合わせると、Zenn/Qiita風に軽いリアクションと本格コメントを分けられます。

[English](./comments.md)

## できること

- 著者・投稿日時・本文つきのコメント一覧をフラットに表示（新しい順）。Site が `CommentsSection` または `ArticleCommentsSection` を配置した場所に表示されます。返信・スレッド構造は未対応で、単一階層の一覧として表示されます
- ローカルプレビュー用の `MemoryCommentsProvider` を同梱
- `CommentsProvider` インターフェースで GitHub Discussions（Giscus経由）などに接続

## クイックスタート

```sh
npm install @riebeckite/plugin-comments
```

```ts
import { defineConfig } from "@riebeckite/core";
import { comments, MemoryCommentsProvider } from "@riebeckite/plugin-comments";

const commentsProvider = new MemoryCommentsProvider();

export default defineConfig({
  plugins: [comments({ provider: commentsProvider })],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `CommentsProvider` | `MemoryCommentsProvider` | コメントの保存・実行層。表示には設定が必要です。 |
| `headingText` | `string` | `"Comments"` | セクションの見出し。 |
| `className` | `string` | `"rr-comments"` | 表示するセクションのルート CSS クラス。 |
| `limit` | `number` | `20` | 1ノートに表示するコメントの上限。 |
| `emptyText` | `string` | `"No comments yet."` | コメントがないときの文言。 |

## 表示

JSX の配置はサイトが所有します。記事の下に `ArticleCommentsSection` を置きます。

```tsx
import { ArticleCommentsSection } from "@riebeckite/plugin-comments";

<ArticleCommentsSection />;
```

`ArticleCommentsSection` はサイト設定からプラグインのオプションを解決し、現在の記事の `contentId` を読み取ります。記事のコンテキスト外、または `provider` が設定されていない場合は何も描画しません。`headingText`、`className`、`emptyText` を渡すと、その配置だけ設定値を上書きできます。

マークアップを自分で組み立てる場合は、ページを取得して `CommentsSection` へ渡します。

```tsx
const page = await provider.getComments(contentId, limit);

<CommentsSection page={page} />;
```

プラグインはビルド時にマニフェストの HTML を注入せず、クライアントエントリも登録しません。コメントは読み取り専用です。

## 関連

- [Reactions](./reactions.ja.md) — 軽い絵文字リアクション
- [Webmention](./webmention.ja.md) — サイトをまたいだメンション
- [プラグインカタログ](./README.ja.md)
