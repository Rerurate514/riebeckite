---
date: 2026-10-14
title: コンテンツインデックス（Content Index）
sidebar:
  hidden: true
---

# コンテンツインデックス（Content Index）

WikiLinkと埋め込みを解決するために使う、小文字化した名前からノートへの対応表です。複数のノートに一致する名前は対応表から外され、誤った対象へ解決する代わりに診断として報告されます。

## キーと接尾辞

`guides/localization.md`のノートでは、`localization`、`guides/localization`、フルパスのすべてのパスの接尾辞がインデックスに登録されます。そのため`[[localization]]`も`[[guides/localization]]`も解決します。

frontmatterのエイリアスは追加のキーとして登録されます。

## 曖昧さ

2つのノートが同じキーを登録すると、そのキーはインデックスから削除され、報告されます。リンクは誤ったノートを指さず、未解決のまま残ります。

曖昧な名前へ意図的にリンクする場合は、明示的なパス形式を使います。

```md
[[glossary/theme|theme]]
```

## コンテンツインデックスの構造

コンテンツインデックスは`ContentIndexBuild`型（`packages/core/src/content/content_index_builder.ts`）で、`ContentIndexBuilder.build()`または`resolveContentIndex()`が返します。次を含みます。

- **`index`** — 小文字化したslugの接尾辞を正規のコンテンツパスへ対応付ける`Map<string, string>`。候補が1つだけのキーはそれに解決し、複数の候補に一致するキーは意図的に含まれません（曖昧）。
- **`ambiguities`** — 曖昧なキーを、並べ替えた候補エントリの一覧へ対応付ける`ReadonlyMap<string, readonly string[]>`。

インデックス構築の出力例：

```ts
{
  index: new Map([
    ["hello", "notes/hello"],
    ["world", "notes/world"],
  ]),
  ambiguities: new Map([
    ["tags", ["notes/tag1", "notes/tag2"]], // multiple notes with "tags" slug suffix
  ]),
}
```

インデックスは、すべてのコンテンツエントリを走査して小文字化したパスの接尾辞（frontmatterのエイリアスを含む）を集め、`resolveContentIndex`で候補を1つにまとめて構築します。キーが複数のノートに一致する場合は、誤った解決を防ぐためインデックスから削除されます。

## 関連用語

- [[glossary/content|Content]]
- [[content-entry|Content Entry]]
- [[slug|Slug]]
- [[logical-path|Logical Path]]
- [[content-manager|Content Manager]]
