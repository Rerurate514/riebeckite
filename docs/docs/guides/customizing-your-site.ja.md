---
date: 2026-10-08
title: サイトのカスタマイズ
---
# サイトのカスタマイズ

Riebeckiteが生成するサイトは、通常の**HonoXアプリケーション**としてカスタマイズできます。Riebeckite独自のUIフレームワークを覚える必要はありません。ページ、コンポーネント、CSS、操作できるUIなどは、通常のHonoX / Hono JSXと同じ方法で変更できます。

Riebeckiteが主に担当するのは、次の部分です。

- Markdownなどのコンテンツを読み込む
- コンテンツやプラグインの情報をサイトへ渡す
- プラグインが提供するページやUIをサイトへ接続する

一方、実際のサイトを構成する`app/`はサイト側のコードです。

## どこを変更すればいい？

まずは、変更したいものに対応する場所を確認してください。

| 変更したいもの | 主な場所 |
| --- | --- |
| ページやURL | `app/routes/` |
| 404（ページが見つからない） | `app/routes/_404.tsx` |
| ヘッダー / フッター | `app/components/`、`app/routes/_renderer.tsx` |
| 記事ページの構成 | `app/components/article.tsx` |
| ボタンなどのUI | `app/components/` |
| 操作できるUI | `app/islands/` |
| 色・余白・文字・レイアウト | `app/style.css`や各CSS |
| ヘッダー / フッターのリンク | `riebeckite.config.ts`の`navigation`プラグイン |

基本的には、**`app/`以下を編集すればサイトの見た目や構成を変更できる**と考えてかまいません。

ただし、`app/.riebeckite/`はRiebeckiteが自動生成するディレクトリです。ビルドのたびに更新されるため、直接編集しないでください。

## コンポーネントを作る

`app/components/`には、通常のHono JSXコンポーネントを作成できます。

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

作成したコンポーネントは、ルートや別のコンポーネントから通常どおりimportして利用できます。

### RiebeckiteのUIプリミティブ

記事ページを作るときは、`@riebeckite/honox/ui`が提供する次のようなUIプリミティブも利用できます。

- `Article`
- `ArticleLayout`
- `ArticleContent`

これらはRiebeckiteの記事構造を組み立てるための小さな部品です。専用のコンポーネントフレームワークではないため、必ず使う必要はありません。サイト側で独自のHTML構造を作ることもできます。

詳しくは[UIプリミティブ](../framework/honox-integration/ui.ja.md#uiプリミティブ)を参照してください。

## 記事ページのレイアウトを変える

スターターでは、記事ページの主な構成を次の2か所で管理しています。

```text
app/components/article.tsx
app/routes/_renderer.tsx
```

### `app/components/article.tsx`

ここにある`SiteArticle`が、記事ページのレイアウトを決めます。たとえば、次のような変更は主にここで行います。

- 記事タイトルの位置を変える
- 記事の前後にUIを追加する
- パンくずリストの位置を変える
- バックリンクや関連記事の位置を変える
- サイドバーを追加する

`SiteArticle`は`@riebeckite/honox/ui`の`Article`を利用して作られていますが、サイト側のコンポーネントなので自由に編集できます。

ルート内で`Article`という名前で使われているものは、このサイト側のコンポーネントを指します。`@riebeckite/honox/ui`の`Article`とは別物です。

### `app/routes/_renderer.tsx`

`_renderer.tsx`は、サイト全体を包む外側のレイアウトです。主に次のものを管理します。

- `<head>`
- ヘッダー
- フッター
- ナビゲーション
- ページ全体の共通UI
- Riebeckiteやプラグインが生成したheadタグとスタイル
- **`RiebeckiteHead`による標準のhead内容の描画**

サイト全体に共通する部分を変えたい場合は、こちらを編集します。

標準のhead内容をフレームワークに任せつつ、独自のheadを追加する例です。

```tsx
import { RiebeckiteHead, ThemeRoot } from "@riebeckite/honox/ui";

export default jsxRenderer(({ children }, c) => (
  <ThemeRoot
    theme={config.theme}
    lang={c.get("htmlLanguage") ?? config.site.locale}
  >
    <head>
      <RiebeckiteHead
        title={config.site.title}
        headTags={c.get("headTags") ?? []}
      />
      <meta name="custom-site-value" content="..." />
    </head>
    <body class="riebeckite-page rb-site">{children}</body>
  </ThemeRoot>
));
```

詳しくは[headタグ](../framework/honox-integration/site.ja.md#headタグ)を参照してください。

## ナビゲーションを変える

ヘッダーやフッターに表示するリンクは、`riebeckite.config.ts`に登録する[`@riebeckite/plugin-navigation`](../reference/configuration/navigation.ja.md)プラグインが提供します。

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

引数なしの`navigation()`はVaultからリンクを導出します。`items`を渡すと手動で選んだリンクに、`secondary`には補助リンクを指定できます。

リンクのモデルを返し、`SiteNav`でツリーを描画するのはプラグインです。描画したリストをどこに置くかはサイトが決めます。スターターでは`app/components/site-header.tsx`が`SiteNav`を使い、`app/routes/_renderer.tsx`が解決済みのモデルと現在のパスを渡します。

そのため、変更したい内容に応じて次のように考えます。

- **リンクを追加・削除したい** → `navigation({ items })`を変更する
- **Vaultからリンクを導出したい** → 引数なしの`navigation()`を使う
- **ヘッダーの見た目やHTMLを変えたい** → `site-header.tsx`を変更する
- **ヘッダー / フッター自体の配置を変えたい** → `_renderer.tsx`を変更する

子の再帰描画、現在のパスの判定、言語を考慮した正規化、外部リンク、`aria-current`といった描画の仕組みは`SiteNav`にあります。サイト側で再実装する必要はありません。設定できる項目は[ナビゲーションの設定](../reference/configuration/navigation.ja.md)を参照してください。

## プラグインが作るページとリンク

Riebeckiteでは、ヘッダーやフッターのナビゲーションとは別に、プラグインがページやリンクを追加することがあります。大きく分けると、次の2種類があります。

### 閲覧するためのページ

検索、タグやフォルダーの一覧、タクソノミーのページ、フィード、サイトマップなどです。これらはプラグインが必要なページやエンドポイントを生成します。

有効化しただけでヘッダーやフッターにリンクが追加されるわけではありません。ヘッダーに表示したい場合は、通常のページと同じように`navigation`へ追加してください。

### 記事同士をつなぐUI

パンくずリスト、バックリンク、関連記事、シリーズの前後リンク、ローカルグラフなどです。これらは主に記事ページの中へ表示されます。プラグインがコンポーネントを公開し、サイトが記事のヘッダーやフッターなど好きな場所へ描画します。

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

`app/routes/`は通常のHonoXのルートディレクトリです。そのため、サイト独自のページも通常どおり追加できます。たとえば`/about`を作りたい場合は、HonoXのルートとして追加できます。

一方、Markdownのコンテンツやプラグインが提供するページについては、基本的に自分でルートを追加する必要はありません。スターターのcatch-allルートが、`contentRouteSsgParams`、`riebeckiteSsgParams`、`resolveRiebeckiteContentRequest`を利用して、コンテンツとプラグインのページ種別を自動的に解決します。

プラグインのページをヘッダーやフッターに表示したい場合も、新しいルートを作るのではなく、`navigation`にリンクを追加します。

## 404（ページが見つからない）

存在しないURLは、HonoX標準の`_404.tsx`ルートが処理します。サイト側の通常のファイルなので、これを編集すると「ページが見つからない」画面を変更できます。

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

「見つからない」と判断するのはRiebeckiteです。描画は`_renderer.tsx`を通るため、404画面でもサイトのテーマ、head、ヘッダー、フッターがそのまま使われます。

押さえておくべき点は2つです。

- ステータスは必ず404のままにします。生成されるプリセットは`c.status(404)`を呼びます。見た目を整えた画面を`200`で返してはいけません。
- 見た目はサイトのものです。マークアップ、文言、リンク、CSSはすべてサイト側で決められます。Riebeckiteが上書き対象となる「既定の404コンポーネント」を用意することはありません。

404画面に到達するのは「見つからない」リクエストだけです。下書き、公開日が未来のコンテンツ、非公開のコンテンツがここへ来ることはないため、404から非公開コンテンツの存在が漏れることはありません。

### 実行時エラーの画面（任意）

Honoの標準のエラー処理がエラーをログに記録し、`500 Internal Server Error`を返すため、サイト側で何かを追加する必要はありません。訪問者向けのエラー画面をサイトのものとして用意したい場合は、HonoXの`app/routes/_error.tsx`（`ErrorHandler`）を利用できます。生成されるプリセットはこれを追加していません。設定、プラグイン、ビルドのエラーは開発者向けであり、ページに偽装せずそのまま見えるべきだからです。

## プラグインのコンポーネントを使う

プラグインによっては、サイトから直接利用できるHono JSXコンポーネントを提供しています。たとえば、バックリンクや目次をサイトの好きな場所へ配置できます。

```tsx
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";

export function ArticleAside({ items, backlinks }: Props) {
  return (
    <aside>
      <TableOfContents items={items} />
      <Backlinks backlinks={backlinks} />
    </aside>
  );
}
```

利用できるコンポーネントや`props`は、それぞれのプラグインのページやパッケージのREADMEを確認してください。多くのコンポーネントは`./components`からdefault importすることもできます。

```tsx
import Backlinks from "@riebeckite/plugin-backlinks/components";
```

`color-mode`は例外で、`ColorModeScript`と`ColorModeToggle`をパッケージのルートから公開しています。

### ページの情報を参照するコンポーネント

プラグインのコンポーネントによっては、現在のページのデータを自分で解決します。`SiteProvider`と、公開された`entry`を持つ`Article`の内側ではコンテキストから読み取るため、サイトはデータを明示的に渡さずに描画できます。`props`を渡した場合は、常にコンテキストより優先されます。

詳しくは[UIコンポーネント](../reference/plugin-api.ja.md#uiコンポーネント)と[UIの提供方法](../plugins/writing-a-plugin.ja.md#ui-や出力を追加する方法)を参照してください。

## 操作できるUIを作る

クリックや状態管理など、ブラウザ側の処理が必要なUIは`app/islands/`に作ります。これは通常のHonoXのアイランドと同じです。作成したアイランドをルートやコンポーネントからimportして利用します。Riebeckite専用のアイランドの仕組みがあるわけではありません。

`app/client.ts`では、次の2つを初期化します。

```ts
createClient();
initRiebeckiteClient();
```

`createClient()`はサイトのクライアント処理を初期化します。`initRiebeckiteClient()`は、プラグインやテーマが提供するブラウザ側の処理を起動します。サイトのアイランドは`app/islands/`、プラグインのブラウザ側処理はプラグイン側というように、責務が分かれています。

## CSSを変更する

サイトのデザインは、`app/style.css`や各コンポーネントのCSSから変更できます。通常のCSSやTailwindを利用できます。

Riebeckiteがプラグインやテーマから生成したCSSは、サイトのCSSから一度だけ読み込みます。

```css
/* app/style.css */
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

`app/.riebeckite/`のファイルは自動生成されるため、直接編集しないでください。

プラグインの見た目を上書きするときは`rr-<feature>`、RiebeckiteのUIプリミティブを調整するときは`rb-*`のCSSフックを利用できます。詳しくは[CSSフック](../reference/plugin-api.ja.md#cssフック)を参照してください。

## 迷ったときの目安

「どこを変更すればいいか分からない」という場合は、次のように考えると簡単です。

| やりたいこと | 変更する場所 |
| --- | --- |
| ヘッダーにリンクを追加したい | `riebeckite.config.ts` |
| ヘッダーの見た目を変えたい | `app/components/site-header.tsx` |
| サイト全体の外枠を変えたい | `app/routes/_renderer.tsx` |
| 記事ページの構成を変えたい | `app/components/article.tsx` |
| 独自のページを追加したい | `app/routes/` |
| 404ページを変えたい | `app/routes/_404.tsx` |
| 独自のコンポーネントを作りたい | `app/components/` |
| 操作できるUIを作りたい | `app/islands/` |
| 色や余白を変えたい | `app/style.css` |
| プラグインのUIを配置したい | プラグインのコンポーネント |

Riebeckiteがコンテンツとプラグインをサイトへ接続し、**最終的なページの見た目と構成はサイトが決める**というのが基本的な考え方です。

## 次に読むページ

- [HonoXとの統合](../framework/honox-integration.ja.md)：RiebeckiteとHonoXの接続、UIプリミティブ
- [プラグイン作成の詳細](../framework/plugin-system.ja.md)：プラグインを作る場合の拡張ポイント
- [プラグインAPI](../reference/plugin-api.ja.md)：プラグインのコンポーネント、ページ、アセット、CSSフックの詳細
