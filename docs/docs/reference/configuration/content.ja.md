---
date: 2026-10-08
title: コンテンツの設定
sidebar:
  label: コンテンツの設定
  order: 20
---
# コンテンツの設定

通常は `content.directory` で、Markdown などを読み込むディレクトリを指定します。

```ts id="dn44si"
content: {
  directory: "content",
}
```

標準的なサイトなら、次のような構成になります。

```text id="w3ifap"
my-site/
├─ app/
├─ content/
├─ public/
├─ package.json
├─ vite.config.ts
└─ riebeckite.config.ts
```

## 除外するファイル

`exclude` を使うと、コンテンツシステムに読み込ませないファイルを指定できます。

```ts id="4kv6vn"
content: {
  directory: "content",
  exclude: [
    "drafts/**",
    "Templates/**",
  ],
}
```

`exclude` は論理パスに対して glob パターンで照合します。`*` は1つのパス要素内、`**` は複数のパス要素をまたいで一致し、`?` は1文字に一致します。

`exclude` に一致したファイルは、コンテンツとして処理される前に除外されます。内部では `isExcluded` がこの判定を行います。

## 公開条件

どのコンテンツを公開するかは、既定では `publishStrategy` で設定します。

```ts id="hp9zx8"
content: {
  filters: {
    publishStrategy: "explicit",
  },
}
```

公開判定にはフロントマターも利用されます。

```yaml id="osj0d5"
---
publish: true
---
```

現在の公開状態は Core で一度だけ解決され、プラグインには次のマニフェストビューとして渡されます。

| ビュー | 含まれるもの | 用途 |
| --- | --- | --- |
| `manifest.publicEntries` | ルーティングできるページ。`public` と `unlisted` | ページ表示、SSG のパス列挙 |
| `manifest.discoverableEntries` | 発見可能な `public` ページだけ | ドキュメントのナビゲーション、検索、フィード、サイトマップ、taxonomy、グラフ、バックリンク、関連記事・最新記事 |

フロントマターで明示的な公開状態を指定できます。

| フロントマター | 結果 |
| --- | --- |
| `visibility: public` | URL で表示でき、一覧や検索にも出る |
| `visibility: unlisted` | URL を知っていれば表示できるが、一覧や検索には出ない |
| `visibility: draft` | URL でも表示されず、一覧や検索にも出ない |
| `publishAt: 2026-01-01T00:00:00.000Z` | ビルド時刻がその日時より前なら非公開、以後のビルドで `public` になる |
| `visibility` / `publishAt` なし | `publishStrategy` に従う。`explicit` は `publish: true` が必要。`selective` は `private: true` と `draft: true` を除外する |

`visibility` や `publishAt` が不正な場合は、推測せずにビルドを失敗させます。予定公開はビルド時刻だけで判定します。Riebeckite は実行時のタイマーを起動しません。

`exclude` と `publishStrategy` は似ていますが、役割が異なります。

```mermaid id="1t5jnq"
flowchart LR
    Files["ファイル"]
    Exclude{"exclude ?"}
    Content["コンテンツ"]
    Publish{"公開 ?"}
    Public["公開コンテンツ"]
    Private["非公開"]

    Files --> Exclude
    Exclude -->|Yes| Skip["読み込まない"]
    Exclude -->|No| Content
    Content --> Publish
    Publish -->|Yes| Public
    Publish -->|No| Private
```

`exclude` は **コンテンツシステムに入れるか**、`publishStrategy` や `visibility` は **サイトでどう扱うか**を決めます。`exclude` されたファイルは、リンク解決やグラフ、診断にも現れません。一方、`draft`、`unlisted`、公開前の `publishAt` は生のマニフェストには残りますが、Core がルート用のビューと発見用のビューから適切に外します。

## ContentSource

通常は `content.directory` を使用しますが、独自の読み込み元を使用する場合は `content.source` を指定できます。

```text id="rbdlxj"
content.directory
    ↓
標準ファイルシステム ContentSource
```

または、

```text id="hrp9p5"
content.source
    ↓
独自 ContentSource
```

のどちらか一方を使用します。

同じコンテンツに対して2つのリーダーを動かすための設定ではありません。

`content.source` を指定する場合は、標準のファイルシステムリーダーを置き換えるものとして扱います。`ContentSource` の取り決めは [設定リファレンス](../configuration-reference.ja.md#contentsource) にあります。
