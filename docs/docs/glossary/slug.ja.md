---
date: 2026-10-14
title: Slug（内部の検索キー）
sidebar:
  hidden: true
---

# Slug（内部の検索キー）

ノートの内部的な検索キーで、コンテンツインデックス、マニフェスト、コンテンツグラフが使います。公開URLではないため、利用側は解決済みの公開先からpermalinkを読みます。

## slugとpermalink

| | slug | permalink |
| --- | --- | --- |
| 対象 | ビルドの内部 | 公開URL |
| 由来 | ファイルパス | 公開先の解決 |
| 例 | `graph.incoming(slug)` | `<a href={permalink}>` |

## 分けて扱う

slugはファイルが移動すると変わりますが、permalinkは設定されたURL規則に従います。slugからURLを組み直すとリダイレクトや多言語化を飛ばすため、[permalink](./permalink.md) を読んでください。

## slugの型と解決

slugはコンテンツインデックス、マニフェスト、コンテンツグラフが使う、ノートの内部的な検索キーです。`ContentManifestEntry`（`packages/core/src/types/content_manifest.ts`）の一部として型付けられ、コンテンツインデックス（`packages/core/src/content/content_index_builder.ts`）を通じてマッピングされます。

主な性質：

- **由来**：ファイルパス（コンテンツルートからの相対）から導かれ、小文字化して `.md` 接尾辞を除いたもの
- **安定性**：ファイルが新しいパスへ移動すると変わる。URL規則が変わっても変わらない
- **解決**：コンテンツインデックスの `Map<string, string>` を引く。キーは小文字のslug接尾辞、値は正規のslug
- **曖昧さ**：複数のノートが同じ小文字slug接尾辞を共有すると、そのキーはインデックスから削除され、曖昧として報告される

slug解決の例：

```ts
// Content at "content/notes/HelloWorld.md" gets slug "notes/helloworld"
// The content index maps "notes/helloworld" → "notes/helloworld"
// A wikilink `[[HelloWorld]]` resolves via the index to the canonical entry
```

曖昧さの診断の例：

```ts
// If both "content/notes/foo.md" and "content/sub/foo.md" exist,
// the key "foo" is ambiguous and removed from the index.
// Link `[[foo]]` stays unresolved rather than pointing at the wrong note.
```
