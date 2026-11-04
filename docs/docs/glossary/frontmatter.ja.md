---
date: 2026-10-14
title: フロントマター（frontmatter）
sidebar:
  hidden: true
---

# フロントマター（frontmatter）

コンテンツファイルの先頭にある YAML のブロックで、タイトル、日付、タグ、公開範囲などの型付きメタデータに解析されます。slug とは独立にノートを識別する安定した id もここに置きます。

## よく使うフィールド

| フィールド | 用途 |
| --- | --- |
| `title` | 表示タイトル |
| `date` | 公開日や並べ替えの日付 |
| `tags` | タクソノミーの値 |
| `series` | シリーズへの所属 |
| `published` | 公開日・フィード用の日付（`string` または `Date`）。公開の可否を決めるスイッチではない |
| `publish` | `explicit` 戦略で公開するためのフラグ |
| `private` | `selective` 戦略で公開から外すフラグ |
| `draft` | `selective` 戦略で下書きにするフラグ |
| `visibility` | 一覧に載せるか unlisted か |
| `aliases` | 追加のリンクキー |
| `id` | 安定したコンテンツ ID |

## 解析

frontmatter は Markdown の本文より先に解析されるため、フックと公開先の解決はメタデータを先に読めます。未知のフィールドはプラグイン用にそのまま残ります。

## 公開を決めるfrontmatterのフィールド

frontmatter には、ノートの公開方法を決める3つの安定したフィールドがあり、`explicit` と `selective` の公開戦略で共通です。

- **`publish`**：戦略が `explicit` のときは、`publish: true` のノートだけが公開されます。`selective` のときは無視されます。
- **`private`**：戦略が `selective` のときは、`private: true` のノートが公開出力から除外されます。`explicit` のときは無視されます。
- **`draft`**：戦略が `selective` のときは、`draft: true` のノートが公開出力から除外されます。`explicit` のときは無視されます。

公開の判定は `packages/core/src/types/publish_strategy.ts` の `isPublishable(strategy, frontmatter)` が行います。

```ts
export function isPublishable(
  strategy: PublishStrategy,
  frontmatter: PublishFrontmatter | undefined,
): boolean {
  if (strategy === "explicit") {
    return frontmatter?.publish === true;
  }
  return !(frontmatter?.private === true || frontmatter?.draft === true);
}
```

`PublishFrontmatter` 型は次のとおりです。

```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```

## frontmatterの解析

frontmatter は Markdown の本文より先に解析されるため、フックと公開先の解決はメタデータを先に読めます。未知のフィールドはプラグイン用にそのまま残ります。解析された frontmatter は `PostFrontmatter` 型に格納され、`ContentManifestEntry`（`packages/core/src/types/content_manifest.ts`）の `frontmatter` フィールドになります。`resolvePublishingState` が公開状態を決めるのにも使われます。

```ts
// From packages/core/src/types/post_content.ts
export type PostFrontmatter = {
  title?: string;
  date?: string | Date;
  tags?: string[];
  series?: string;
  published?: string | Date;
  visibility?: "public" | "unlisted" | "draft";
  aliases?: string[];
  id?: string;
};
```

## 関連用語

- [[glossary/page|Page]]
- [[publish-strategy|Publish Strategy]]
