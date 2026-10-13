---
title: Content Query
sidebar:
  hidden: true
---

# Content Query

タグ、フォルダ、日付、またはfrontmatterフィールドでコンテンツentryを選択・フィルタリングし、リスト表示やプラグインデータに使用されます。taxonomy、series、関連投稿で使用されます。

## クエリ方法

コンテンツクエリは`content-query`プラグインを通じて解決され、以下のフィルタリングがサポートされます。

| フィルタ種類 | 説明 |
| --- | --- |
| `tag` | tagによるマッチング |
| `folder` | フォルダパスによるマッチング |
| `date` | 公開日によるマッチング |
| `frontmatter field` | 任意のfrontmatterキーによるマッチング |

```ts
import { searchItems } from "@riebeckite/plugins/search";

const results = searchItems(entries, "tag:news");
```

## 関連用語

- [[content-collection|Content Collection]]
- [[glossary/taxonomy|Taxonomy]]
- [[glossary/series|Series]]
- [[manifest|Manifest]]

## さらに詳しく

- [../plugins/query.ja.md]