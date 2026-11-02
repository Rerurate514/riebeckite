---
date: 2026-10-14
title: 公開境界（Publication Boundary）
sidebar:
  hidden: true
---

# 公開境界（Publication Boundary）

どのコンテンツを公開して安全かを決める規則です。Riebeckite は公開戦略と frontmatter を適用し、公開可否の判定を散在させず一箇所に集めます。

## 公開戦略とfrontmatterの詳細

公開境界は公開可否の判定を一箇所に集め、チェックを散在させません。詳細は次のとおりです。

- **公開戦略** `explicit`（既定）：`publish: true` を持つノートだけが公開されます。`ResolvedRiebeckiteConfig`（`packages/core/src/types/resolved_riebeckite_config.ts`）の `content.filters.publishStrategy` で制御します。
- **公開戦略** `selective`：`private: true` または `draft: true` が無いノートを公開します。
- **Frontmatter `visibility: draft`**：routable にも discoverable にも含めません。ページは生成されません。
- **Frontmatter `visibility: unlisted`**：permalink では配信しますが、ナビゲーション、タクソノミー、検索、フィード、サイトマップ、グラフ、Hover Preview の索引には含めません。

既定の `explicit` 公開戦略を明示する設定の例：

```ts
// riebeckite.config.ts
export default {
  content: {
    directory: "content",
    filters: {
      publishStrategy: "explicit",
    },
  },
};
```

公開するノートを指定する frontmatter の例：

```yaml
---
title: "Public note"
publish: true
---
```

`selective` でノートを除外する場合は `private: true` または `draft: true` を使います。

unlisted にする frontmatter の例：

```yaml
---
title: "Unlisted note"
visibility: unlisted
---
```

## 判定は一箇所

判定を一箇所に集めているため、どの利用側も同じ公開集合を見ます。ページ、フィード、サイトマップが個別に公開可否を再チェックすることはありません。公開状態はマニフェストのビルド時に一度だけ解決され、その後は各 `ContentManifestEntry` の `publishing` フィールドから読みます。
