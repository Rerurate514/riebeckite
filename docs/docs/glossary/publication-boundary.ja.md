---
title: Publication Boundary
sidebar:
  hidden: true
---

# Publication Boundary

どのコンテンツを公開して安全かを決める規則です。Riebeckiteはpublish strategyとfrontmatterを適用し、公開判定を一箇所に集めます。

## strategyとfrontmatterの詳細

公開境界は公開判定を散らばらずに一箇所に集めます。詳細情報：

- **Publish strategy** `selective`: 公開指定のあるコンテンツだけを公開。`ResolvedRiebeckiteConfig`(`packages/core/src/types/resolved_riebeckite_config.ts`)の`content.filters.publishStrategy`で制御されます。
- **Frontmatter `published: false`**: ノートを公開集合から外します。直接URLがわかればアクセス可能ですが、ナビゲーション、検索、feed、sitemapに表示されません。
- **Frontmatter `visibility: unlisted`**: oneindexなしでノートを提供します。permalinkからは公開アクセス可能ですが、タクソノミー一覧、検索結果、sitemapには表示されません。

`selective`publish strategyを持つconfigの例:

```ts
// riebeckite.config.ts
export default {
  content: {
    directory: "content",
    filters: {
      publishStrategy: "selective",
    },
  },
};
```

公開を制御するfrontmatterの例:

```yaml
---
title: "Draft note"
published: false
---
```

non-listedのfrontmatterの例:

```yaml
---
title: "Unlisted note"
visibility: unlisted
---
```

## 判定を一箇所に

判定を一箇所に集めるため、どの利用側も同じ公開集合を見ます。ページ、feed、sitemapが個別に公開判定をやり直すことはありません。公開状態はmanifestのビルド時に一度解決され、その後、各`ContentManifestEntry`の`publishing`フィールドから参照されます。
