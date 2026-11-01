---
date: 2026-10-14
title: コンテンツID（Content ID）
sidebar:
  hidden: true
---

# コンテンツID（Content ID）

frontmatter に書く安定した識別子で、slug や permalink とは独立にノートを指します。ファイルの移動や URL の変更をまたいで残るため、外部から参照するときの適切なキーになります。

## id、slug、permalinkの違い

| 識別子 | 設定する主体 | 変わるタイミング |
| --- | --- | --- |
| `id` | 著者が frontmatter に書く | 編集しない限り変わらない |
| slug | ファイルのパス | ファイルを移動したとき |
| permalink | 公開先の解決 | URL の規則や設定を変えたとき |

## コンテンツIDの解決

frontmatter の `contentId` フィールド（`packages/core/src/types/post_content.ts`）は、slug や permalink とは独立した安定した識別子を提供します。frontmatter に `id` がある場合、それはマニフェストエントリ（`packages/core/src/types/content_manifest.ts`）の `contentId` として保存され、マニフェスト（`packages/core/src/types/resolved_riebeckite_config.ts`）の `byContentId` マップを通じて公開されます。

`contentId` の用途：

- **外部参照**：外部のシステムがノートを指し、ファイル名の変更や URL の変更後も参照を維持する必要がある場合は、slug や permalink ではなく `contentId` を使います。
- **コレクション間のリンク**：異なるコンテンツコレクションや外部システムの間でリンクする場合、`contentId` はファイルの移動や URL の変更をまたいで残ります。
- **増分ビルドのキャッシュ**：`contentId` はキャッシュのフィンガープリントの計算に含まれるため、同じ `contentId` を持つエントリをビルド間で正しく追跡できます。

`id` を含む frontmatter の例：

```yaml
---
id: abc123
title: "Hello World"
tags: ["intro"]
---
```

コードでコンテンツ ID から検索する例：

```ts
const entry = manifest.byContentId.get("abc123");
// entry.slug, entry.permalink, entry.frontmatter, etc.
```
