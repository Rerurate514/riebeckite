---
date: 2026-10-14
title: Frontmatter
sidebar:
  hidden: true
---

# Frontmatter

コンテンツファイルの先頭にあるYAMLのブロックで、title、date、tags、visibilityなどの型付きメタデータに解析されます。slugとは独立にノートを識別する安定したidもここに置きます。

## よく使うfield

| field | 用途 |
| --- | --- |
| `title` | 表示タイトル |
| `date` | 公開日や並び替えの日付 |
| `tags` | Taxonomyの値 |
| `series` | Seriesへの所属 |
| `published` | 公開の判定 |
| `visibility` | 一覧に載せるかunlistedか |
| `aliases` | 追加のリンクキー |
| `id` | 安定したcontent id |

## 解析

frontmatterは本文より先に解析するため、hookと公開位置の解決はメタデータを先に読めます。未知のfieldはPlugin用にそのまま残ります。

## 公開を決めるfrontmatterのfield

frontmatterには3つの安定したfieldがあり、公開の判定に寄与します。`explicit`と`selective`のpublish strategyで共有されます：

- **`publish`**: `explicit`のときは`publish: true`を設定したノートだけを公開します。
- **`private`**: `selective`のときは`private: true`が設定されているノートは公開から除外されます。
- **`draft`**: `selective`のときは`draft: true`が設定されているノートは公開から除外されます。

公開の判定は`isPublishable(strategy, frontmatter)`が行います。

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

`PublishFrontmatter`型は次のとおりです：

```ts
export type PublishFrontmatter = {
  readonly publish?: unknown;
  readonly private?: unknown;
  readonly draft?: unknown;
};
```

## frontmatterの解析

frontmatterは本文より先に解析されるため、hookと公開位置の解決はメタデータを先に読めます。未知のfieldはPlugin用にそのまま残ります。解析されたfrontmatterは`PostFrontmatter`型に格納され、`ContentManifestEntry`の`frontmatter`フィールド（`packages/core/src/types/content_manifest.ts`）になります。また`resolvePublishingState`によって公開状態を決定するために使用されます。

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
