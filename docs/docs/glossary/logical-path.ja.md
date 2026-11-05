---
date: 2026-10-14
title: 論理パス（Logical Path）
sidebar:
  hidden: true
---

# 論理パス（Logical Path）

コンテンツルートを基準に表した、コンテンツファイルの位置です。Riebeckite は論理パスを安定して保ち、公開パスへは別にマッピングします。

## 論理パス

`content/notes/hello.md` の論理パスは `notes/hello` です。コンテンツシステムが扱うのはこの論理パスであり、公開 URL と同じとは限りません。

## 公開パスへのマッピング

公開先の解決が論理パスを[公開パス](./public-path.md)へマッピングします。[フォルダーページ](./folder-page.md)や permalink の規則を使えば、ファイルを移動せずにマッピングを変えられます。

## コンテンツ位置の型

解決された公開位置は `ContentPublicLocation`（`packages/core/src/types/content_manifest.ts`）として型付けされています。その形は次のとおりです。

- **`slug`** — 内部コンテンツの slug。論理パスと一致します
- **`permalink`** — ノートの正規の公開 URL
- **`language`** — 任意の言語コード（多言語コンテンツ用）
- **`redirects`** — URL リダイレクト用の任意の `ContentRedirect` 配列
- **`metadata`** — 追加メタデータ用の任意の `Record<string, string>`

`ContentPublicLocation` の例：

```ts
{
  slug: "notes/hello",
  permalink: "/docs/notes/hello/",
  language: "ja",
  redirects: [{ path: "/old-url/", status: 301 }],
  metadata: { author: "tanaka" },
}
```

論理パスそのもの（例：`content/notes/hello.md` に対する `notes/hello`）は、コンテンツルート内の相対パスです。公開先の解決を通じて公開パスに変換されます。解決には次の要素が関与します。

- 既定のマッピング：`slug` → `/${slug}/`
- `resolveContentLocations` フックによるプラグインのパス調整
- 多言語コンテンツへのロケール接頭辞の挿入
- ディレクトリのインデックスを別の URL へ対応させるフォルダーページの規則

論理パスと公開パスを分けることで、コンテンツファイルを移動せずに URL 構造を変えられます。また、内部のコンテンツ ID を安定させたまま、ロケール別のルーティングが可能になります。
