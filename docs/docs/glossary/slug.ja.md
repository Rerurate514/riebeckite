---
title: Slug
sidebar:
  hidden: true
---

# Slug

ノートの内部的な検索キーで、content index、manifest、content graphが使います。公開URLではないため、公開側では解決済みの公開位置からpermalinkを読みます。

## slugとpermalink

| | slug | permalink |
| --- | --- | --- |
| 対象 | Buildの内部 | 公開URL |
| 由来 | ファイルのパス | 公開位置の解決 |
| 例 | `graph.incoming(slug)` | `<a href={permalink}>` |

## 分けて扱う

slugはファイルの移動で変わりますが、permalinkは設定したURLの規則に従います。slugからURLを再計算するとredirectやlocalizationを飛ばすため、permalinkを読みます。

## slugの型と解決

slugはcontent index、manifest、content graphが使うノートの内部的な検索キーです。`ContentManifestEntry`(`packages/core/src/types/content_manifest.ts`)の一部として型付けされており、content index (`packages/core/src/content/content_index_builder.ts`)を通じてマッピングされます。

主なプロパティ：

- **由来**: ファイルパスから導かれる（content rootからの相対パス）、小文字化され、`.md`のsuffixが除去された状態
- **安定性**: ファイルが新しいパスに移動したときに変わる；URL規則が変更されたときには変わらない
- **解決**：content indexの`Map<string, string>`を検索します。キーは小文字のslug suffixで、値はcanonicalなslugです。
- **曖昧さ**: 複数のノートが同じsmallcaseのslug suffixを共有する場合、そのキーはindexから削除され、ambiguityとして報告される

slug解決の例:

```ts
// "content/notes/HelloWorld.md" にあるコンテンツは slug "notes/helloworld" になる
// content index は "notes/helloworld" → "notes/helloworld" とマップする
// wikilink `[[HelloWorld]]` は index を経由して canonical entry に解決する
```

曖昧性diagnosticsの例:

```ts
// "content/notes/foo.md" と "content/sub/foo.md" の両方が存在する場合
// キー "foo" はambiguousとなり、indexから削除される
// Link `[[foo]]` は誤ったノートを指さないよう、未解決のまま残ります
```
