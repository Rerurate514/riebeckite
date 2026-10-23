---
date: 2026-10-14
title: 公開境界（Publication Boundary）
sidebar:
  hidden: true
---

# 公開境界（Publication Boundary）

どのコンテンツを公開して安全かを決める規則です。Riebeckiteは公開戦略とfrontmatterを適用し、公開可否の判定を散在させず一箇所に集めます。

## 公開戦略とfrontmatterの詳細

公開境界は公開可否の判定を一箇所に集め、チェックを散在させません。詳細は次のとおりです。

- **公開戦略** `selective`：公開指定のあるコンテンツだけが公開されます。`ResolvedRiebeckiteConfig`（`packages/core/src/types/resolved_riebeckite_config.ts`）の `content.filters.publishStrategy` で制御します。
- **Frontmatter `published: false`**：ノートを公開集合から外します。URLを知っていれば直接アクセスできますが、ナビゲーション、検索、フィード、サイトマップには表示されません。
- **Frontmatter `visibility: unlisted`**：索引に載せずにノートを配信します。permalinkからは公開アクセスできますが、タクソノミー一覧、検索結果、サイトマップには表示されません。

`selective` 公開戦略を使う設定の例：

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

公開を制御するfrontmatterの例：

```yaml
---
title: "Draft note"
published: false
---
```

unlistedにするfrontmatterの例：

```yaml
---
title: "Unlisted note"
visibility: unlisted
---
```

## 判定は一箇所

判定を一箇所に集めているため、どの利用側も同じ公開集合を見ます。ページ、フィード、サイトマップが個別に公開可否を再チェックすることはありません。公開状態はマニフェストのビルド時に一度だけ解決され、その後は各 `ContentManifestEntry` の `publishing` フィールドから読みます。
