---
date: 2026-10-08
title: ページとナビゲーション
sidebar.label: ページとナビゲーション
sidebar.order: 20
---
# ページとナビゲーション

## ナビゲーションを変える

ヘッダーやフッターに表示するリンクは、`riebeckite.config.ts` に登録する[`@riebeckite/plugin-navigation`](../../reference/configuration/navigation.ja.md)プラグインが提供します。

```ts
plugins: [
  navigation({
    items: [
      { label: "Guide", href: "/guide" },
      {
        label: "Notes",
        href: "/notes/planning",
        children: [
          { label: "Planning", href: "/notes/planning" },
          { label: "Writing", href: "/notes/writing" },
        ],
      },
    ],
    secondary: [{ label: "GitHub", href: "https://github.com/example/site" }],
  }),
]
```

引数なしの `navigation()` は Vault からリンクを導出します。`items` を渡すと手動で選んだリンクに、`secondary` には補助リンクを指定できます。

リンクのモデルを返し、`SiteNav` でツリーを描画するのはプラグインです。描画したリストをどこに置くかはサイトが決めます。スターターでは `app/components/site-header.tsx` が `SiteNav` を使い、`app/routes/_renderer.tsx` が解決済みのモデルと現在のパスを渡します。

そのため、変更したい内容に応じて次のように考えます。

- **リンクを追加・削除したい** → `navigation({ items })` を変更する
- **Vault からリンクを導出したい** → 引数なしの `navigation()` を使う
- **ヘッダーの見た目や HTML を変えたい** → `site-header.tsx` を変更する
- **ヘッダー / フッター自体の配置を変えたい** → `_renderer.tsx` を変更する

子の再帰描画、現在のパスの判定、言語を考慮した正規化、外部リンク、`aria-current` といった描画の仕組みは `SiteNav` にあります。サイト側で再実装する必要はありません。設定できる項目は[ナビゲーションの設定](../../reference/configuration/navigation.ja.md)を参照してください。

## プラグインが作るページとリンク

Riebeckite では、ヘッダーやフッターのナビゲーションとは別に、プラグインがページやリンクを追加することがあります。大きく分けると、次の2種類があります。

### 閲覧するためのページ

[[glossary/search|検索]]、タグやフォルダーの一覧、[[glossary/taxonomy|タクソノミー]]のページ、フィード、[[glossary/sitemap|サイトマップ]]などです。これらはプラグインが必要なページやエンドポイントを生成します。

有効化しただけでヘッダーやフッターにリンクが追加されるわけではありません。ヘッダーに表示したい場合は、通常のページと同じように `navigation` へ追加してください。

### 記事同士をつなぐUI

パンくずリスト、バックリンク、関連記事、[[glossary/series|シリーズ]]の前後リンク、ローカルグラフなどです。これらは主に記事ページの中へ表示されます。プラグインがコンポーネントを公開し、サイトが記事のヘッダーやフッターなど好きな場所へ描画します。

つまり、次のような違いがあります。

```text
ヘッダー / フッターのリンク
        ↓
riebeckite.config.ts の navigation

検索・タグ・フォルダーなどのページ
        ↓
プラグインのページ種別

パンくずリスト・バックリンクなど
        ↓
プラグインのコンポーネント
```

## ルートを追加する

`app/routes/` は通常の HonoX のルートディレクトリです。そのため、サイト独自のページも通常どおり追加できます。たとえば `/about` を作りたい場合は、HonoX のルートとして追加できます。

一方、Markdown のコンテンツやプラグインが提供するページについては、基本的に自分でルートを追加する必要はありません。スターターの catch-all ルートが `createContentRoute` を呼び、コンテンツとプラグインの[[glossary/page-type|ページ種別]]を自動的に解決します。

プラグインのページをヘッダーやフッターに表示したい場合も、新しいルートを作るのではなく、`navigation` にリンクを追加します。

## 404（ページが見つからない）

存在しない URL は、HonoX 標準の `_404.tsx` ルートが処理します。サイト側の通常のファイルなので、これを編集すると「ページが見つからない」画面を変更できます。

```tsx
// app/routes/_404.tsx
import type { NotFoundHandler } from "hono";

const handler: NotFoundHandler = (c) => {
  c.status(404);

  return c.render(
    <div class="not-found">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or is not available.</p>
      <a href="/">Back to home</a>
    </div>,
  );
};

export default handler;
```

「見つからない」と判断するのは Riebeckite です。描画は `_renderer.tsx` を通るため、404画面でもサイトの[[glossary/theme|テーマ]]、head、ヘッダー、フッターがそのまま使われます。

押さえておくべき点は2つです。

- ステータスは必ず404のままにします。生成される[[glossary/preset|プリセット]]は `c.status(404)` を呼びます。見た目を整えた画面を `200` で返してはいけません。
- 見た目はサイトのものです。マークアップ、文言、リンク、CSS はすべてサイト側で決められます。Riebeckite が上書き対象となる「既定の404コンポーネント」を用意することはありません。

404画面に到達するのは「見つからない」リクエストだけです。[[glossary/draft|下書き]]、公開日が未来のコンテンツ、非公開のコンテンツがここへ来ることはないため、404から非公開コンテンツの存在が漏れることはありません。

### 実行時エラーの画面（任意）

Hono の標準のエラー処理がエラーをログに記録し、`500 Internal Server Error` を返すため、サイト側で何かを追加する必要はありません。訪問者向けのエラー画面をサイトのものとして用意したい場合は、HonoX の `app/routes/_error.tsx`（`ErrorHandler`）を利用できます。生成されるプリセットはこれを追加していません。設定、プラグイン、ビルドのエラーは開発者向けであり、ページに偽装せずそのまま見えるべきだからです。
