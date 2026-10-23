---
date: 2026-10-14
title: フロントマター（frontmatter）
sidebar:
  hidden: true
---

# フロントマター（frontmatter）

コンテンツファイルの先頭にあるYAMLのブロックで、タイトル、日付、タグ、公開範囲などの型付きメタデータに解析されます。slugとは独立にノートを識別する安定したidもここに置きます。

## よく使うフィールド

| フィールド | 用途 |
| --- | --- |
| `title` | 表示タイトル |
| `date` | 公開日や並べ替えの日付 |
| `tags` | タクソノミーの値 |
| `series` | シリーズへの所属 |
| `published` | 公開の判定 |
| `visibility` | 一覧に載せるかunlistedか |
| `aliases` | 追加のリンクキー |
| `id` | 安定したコンテンツID |

## 解析

frontmatterはMarkdownの本文より先に解析されるため、フックと公開先の解決はメタデータを先に読めます。未知のフィールドはプラグイン用にそのまま残ります。

## 公開を決めるfrontmatterのフィールド

frontmatterには、ノートの公開方法を決める3つの安定したフィールドがあり、`explicit`と`selective`の公開戦略で共通です。

- **`publish`**：戦略が`explicit`のときは、`publish: true`のノートだけが公開されます。`selective`のときは無視されます。
- **`private`**：戦略が`selective`のときは、`private: true`のノートが公開出力から除外されます。`explicit`のときは無視されます。
- **`draft`**：戦略が`selective`のときは、`draft: true`のノートが公開出力から除外されます。`explicit`のときは無視されます。

公開の判定は`packages/core/src/types/publish_strategy.ts`の`isPublishable(strategy, frontmatter)`が行います。

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

`PublishFrontmatter`型は次のとおりです。

```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```

## frontmatterの解析

frontmatterはMarkdownの本文より先に解析されるため、フックと公開先の解決はメタデータを先に読めます。未知のフィールドはプラグイン用にそのまま残ります。解析されたfrontmatterは`PostFrontmatter`型に格納され、`ContentManifestEntry`（`packages/core/src/types/content_manifest.ts`）の`frontmatter`フィールドになります。`resolvePublishingState`が公開状態を決めるのにも使われます。

```ts
// From packages/core/src/types/post_content.ts
export type PostFrontmatter = {
  title?: string;
  date?: string | Date;
  tags?: string[];
  series?: string;
  published?: boolean;
  visibility?: "public" | "unlisted" | "draft" | "scheduled";
  aliases?: string[];
  id?: string;
};
```

## 関連用語

- [[glossary/page|Page]]
- [[publish-strategy|Publish Strategy]]
