---
title: Alias
sidebar:
  hidden: true
---

# Alias

ノートの別名で、manifestに追加の検索キーとして記録します。slugやpermalinkを変えずにWikiLinkを同じノートへ解決しますが、同じ名前を二重に使うと曖昧になります。

## aliasの設定

```yaml
---
aliases: [Getting Started, Quick Start]
---
```

## 解決と曖昧さ

各aliasは、このノートへ解決するキーとしてcontent indexに登録されます。2つのノートが同じaliasを主張するとキーが曖昧になり、それを使うリンクが報告されます。

## content indexへの登録

エイリアリはfrontmatterから`extractFrontmatterAliases`（`packages/core/src/content/content_metadata.ts`）によって抽出され、`ContentManifest.byAlias`に登録されます。`contentIndex`は小文字化したキーを使って検索し、エイリアリも同様のsmall文字化された解決に従います。複数のエントリが同じエイリアスキーを主張する場合、そのキーは`contentIndexAmbiguities`に移され意図的に通常のインデックスから除外されます。これにより、優先順位に依存するのではなく、リンクは解決されないままにされます。

エイリアスが曖昧な場合、`[[alias-name]]`を使用したwikilinkは解決されず、診断として報告されます。単一のエイリアスキーの場合はnormallyノートへリンクされます。

```ts
// From packages/core/src/types/content_manifest.ts
interface ContentManifest {
  byAlias: Map<string, ContentManifestEntry[]>;
  contentIndex: Map<string, string>;
  contentIndexAmbiguities?: ReadonlyMap<string, readonly string[]>;
}
```
