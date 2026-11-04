---
date: 2026-10-14
title: コンテンツエントリ（Content Entry）
sidebar:
  hidden: true
---

# コンテンツエントリ（Content Entry）

マニフェスト内の解決済みのコンテンツ項目1件で、slug で識別されます。パーマリンク、公開先、frontmatter、公開状態、HTML、プラグインが提供するデータを保持します。

## エントリが保持するもの

- `slug` — 内部的なキー。
- `publicLocation` — 解決済みのパーマリンク、リダイレクト、メタデータ。
- `frontmatter` — 解析済みのメタデータ。
- `html` — 描画済みの本文。
- サイトが描画するデータヘルパーや JSX コンポーネントなど、プラグインが提供するデータ。

## slugとpermalink

slug はビルドの内部でエントリを識別し、permalink は公開 URL です。エントリへリンクする側は slug ではなく、エントリの permalink を読みます。

## コンテンツマニフェストのエントリのフィールド

各 `ContentManifestEntry` は次のフィールドを持ち、すべてコンテンツ処理中に埋められます。

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `slug` | `string` | エントリを識別する内部的なキー。 |
| `contentId` | `string \| undefined` | slug、permalink、エイリアス、リダイレクトとは独立した、ソースに著者が書く任意の安定したコンテンツ識別子。 |
| `permalink` | `string` | 解決済みの公開 URL（例：`/blog/my-post/`）。 |
| `publicLocation` | `ContentPublicLocation` | このエントリの slug、permalink、言語、リダイレクト、メタデータ。 |
| `title` | `string` | ページのタイトル。 |
| `aliases` | `readonly string[]` | WikiLink の検索キーに使う frontmatter のエイリアスパス。リダイレクトではない。 |
| `frontmatter` | `PostFrontmatter` | 解析済みの frontmatter メタデータ。 |
| `publishing` | `ResolvedPublishingState` | 公開状態（`published`、`unlisted`、`draft`、`scheduled` など）。 |
| `html` | `string` | 描画済みの HTML 本文。 |
| `tags` | `string[]` | このエントリに関連付けられたタグ。 |
| `links` | `ContentLink[]` | コンテンツ内で解決された Markdown リンク/WikiLink の参照。 |
| `backlinks` | `string[]` | コンテンツグラフから自動計算されるバックリンク。 |
| `assets` | `ContentAsset[]` | このエントリが参照するコンテンツの画像と添付ファイル。 |

利用側は通常、リンクには `permalink`、メタデータには `frontmatter`、レイアウトの構成にはプラグインが提供するデータを使います。

---

## ページがエントリのデータを読む方法

ページやテンプレートは、マニフェストの検索用マップを通じてエントリのデータにアクセスします。よくある形は次のとおりです。

- **パーマリンクの解決**：`entry.permalink` を直接読むか、slug から URL を引く `byPermalink` マップを使う。
- **frontmatter**：ページ単位のメタデータ（タイトル、日付、タグなど）に `entry.frontmatter` でアクセスする。
- **head タグ**：プラグインが `entry.headTags` を提供し、サイトのシェルが `<head>` 内に描画する。
- **アセット**：`entry.assets` にはこのエントリに関連するコンテンツの画像と添付ファイルが入る。サイトは出力時にコピーするか参照する。

サイトのテンプレートでのエントリ参照の例：

```ts
const entry = manifest.bySlug.get("my-post");
if (entry) {
  const url = entry.permalink;
  const title = entry.title;
  const meta = entry.frontmatter;
  }
```
