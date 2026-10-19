---
title: Content Index
sidebar:
  hidden: true
---

# Content Index

WikiLinkやembedを解決するための、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は載せず、誤った解決を避けてdiagnosticとして報告します。

## キーとパスの後方一致

`guides/localization.md`のノートは、`localization`、`guides/localization`、フルパスの各キーで登録されます。そのため`[[localization]]`も`[[guides/localization]]`も解決します。

frontmatterのaliasも追加のキーとして登録します。

## 曖昧さ

2つのノートが同じキーを登録すると、そのキーは対応表から外し、報告します。リンクは誤ったノートを指さず、未解決のまま残ります。

曖昧な名前へ意図的にリンクする場合は、明示的なパス形式を使います。

```md
[[glossary/theme|theme]]
```

## content indexの構造

content indexは`ContentIndexBuild`(`packages/core/src/content/content_index_builder.ts`)の型で、`ContentIndexBuilder.build()`または`resolveContentIndex()`が返します。以下のプロパティを持ちます：

- **`index`** ：`Map<string, string>`。lowercase slug suffixからcanonicalなcontent pathへのマッピング。キーが1つの候補だけと一致する場合、それを解決キーとします。複数の候補と一致するキーは意図的にインデックスから外されます（曖昧と判定）。
- **`ambiguities`** ：`ReadonlyMap<string, readonly string[]>`。曖昧なキーを、ソートされた候補のリストへマップします。

index構築の出力例：

```ts
{
  index: new Map([
    ["hello", "notes/hello"],
    ["world", "notes/world"],
  ]),
  ambiguities: new Map([
    ["tags", ["notes/tag1", "notes/tag2"]], // "tags" slug suffixを持つノートが複数存在
  ]),
}
```

indexはすべてのコンテンツentryを走査し、lowercasedなパスの後方一致（frontmatter aliasも含む）を収集した後、`resolveContentIndex`によって候補を収束させます。キーが1つのノートと一致しない場合、インデックスから外され、誤った解決を防ぎます。

## 関連用語

- [[glossary/content|Content]]
- [[content-entry|Content Entry]]
- [[slug|Slug]]
- [[logical-path|Logical Path]]
- [[content-manager|Content Manager]]
