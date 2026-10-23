---
date: 2026-10-14
title: エイリアス（Alias）
sidebar:
  hidden: true
---

# エイリアス（Alias）

ノートに付ける別名で、マニフェストには追加の検索キーとして記録されます。エイリアスを使うと、slugやpermalinkを変えずにWikiLinkを同じノートへ解決できます。同じ名前を2つのノートで使うと、そのキーは曖昧になります。

## エイリアスの設定

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## 解決と曖昧さ

各エイリアスは、このノートへ解決するキーとしてコンテンツインデックスに登録されます。2つのノートが同じエイリアスを宣言するとキーは曖昧になり、そのキーを使うリンクは診断として報告されます。

## コンテンツインデックスへの登録

エイリアスはfrontmatterから`extractFrontmatterAliases`（`packages/core/src/content/content_metadata.ts`）で抽出され、`ContentManifest.byAlias`に登録されます。`contentIndex`はキーを小文字化して検索し、エイリアスも同じ小文字化の規則に従います。複数のエントリが同じエイリアスキーを持つ場合、そのキーは`contentIndexAmbiguities`へ移され、通常のインデックスからは意図的に外されます。そのため、そのキーを使うリンクは検出順で対象を選ぶのではなく、未解決のまま残ります。

```ts
// From packages/core/src/content/content_metadata.ts
export function extractFrontmatterAliases(markdown: string): string[] {
  // ...extracts `alias` and `aliases` from frontmatter
}

// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  byAlias: Map<string, ContentManifestEntry[]>;
  contentIndex: Map<string, string>;
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
}
```

エイリアスが曖昧な場合、`[[alias-name]]`を使ったWikiLinkは解決されず、診断として報告されます。単一のエイリアスキーは通常どおり対象のノートへ解決されます。
