---
date: 2026-10-14
title: Logical Path
sidebar:
  hidden: true
---

# Logical Path

content rootを基準に表した、コンテンツファイルの位置です。Riebeckiteはlogical pathを安定して保ち、公開パスへは別に対応させます。

## logical path

`content/notes/hello.md`のlogical pathは`notes/hello`です。content systemが扱うのはこのlogical pathで、公開URLと同じとは限りません。

## 公開パスへの対応

公開位置の解決がlogical pathをpublic pathに対応させます。folder pageやpermalinkの規則を使えば、ファイルを移動せずに対応を変えられます。

## 公開位置の種類

解決された公開位置は`ContentPublicLocation`(`packages/core/src/types/content_manifest.ts`)で型付けされています。以下のプロパティを持ちます：

- **`slug`** ：コンテンツのスラッグ。logical pathに一致します
- **`permalink`** ：ノートの正規の公開URL
- **`language`** ：言語コード（ローカライズされたコンテンツ用のオプション）
- **`redirects`** ：`ContentRedirect`の配列。URLリダイレクト用のオプション
- **`metadata`** ：追加メタデータ用の`Record<string, string>`のオプション

example `ContentPublicLocation`:

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  language: "ja",
  redirects: ["/old-url/"],
  metadata: { author: "tanaka" },
}
```

logical path自体は（例：`content/notes/hello.md`から`notes/hello`）content root内の相対パスです。location resolutionを通じて公開pathにマップされます。これには以下が関与します：

- デフォルトマッピング: `slug`→ `/${slug}/`
- `resolveContentLocations`hookによるplugin調整パス
- ローカライズされたコンテンツ用のlocale prefix挿入
- ディレクトリインデックスを異なるURLにマッピングするfolder pageルール

logical pathとpublic pathを分離することで、コンテンツファイルを移動させずにURL構造を変更できます。内部コンテンツのアイデンティティを安定させたまま、locale固有のルーティングが可能になります。

公開位置の解決がlogical pathをpublic pathに対応させます。folder pageやpermalinkの規則を使えば、ファイルを移動せずに対応を変えられます。
