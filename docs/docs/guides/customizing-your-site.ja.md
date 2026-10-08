# サイトのカスタマイズ

Riebeckite で生成するサイトは、通常の **HonoX application** としてカスタマイズできます。

Riebeckite 独自の UI framework を覚える必要はありません。ページ、component、CSS、interactive UI などは、通常の HonoX / Hono JSX と同じ方法で変更できます。

Riebeckite は主に、次の部分を担当します。

- Markdown などの content を読み込む
- content や plugin の情報を Site に渡す
- plugin が提供するページや UI を Site に接続する

一方、実際のサイトを構成する `app/` は Site 側のコードです。

## どこを変更すればいい？

まずは、変更したいものに対応する場所を確認してください。

| 変更したいもの | 主な場所 |
| --- | --- |
| ページや URL | `app/routes/` |
| 404（ページが見つからない） | `app/routes/_404.tsx` |
| Header / Footer | `app/components/`、`app/routes/_renderer.tsx` |
| 記事ページの構成 | `app/components/article.tsx` |
| ボタンなどの UI | `app/components/` |
| 操作できる UI | `app/islands/` |
| 色・余白・文字・レイアウト | `app/style.css` や各 CSS |
| Header / Footer のリンク | `riebeckite.config.ts` の `navigation` plugin |

基本的には **`app/` 以下を編集すればサイトの見た目や構成を変更できる** と考えてかまいません。

ただし、`app/.riebeckite/` は Riebeckite が自動生成するディレクトリです。ビルドのたびに更新されるため、直接編集しないでください。

## Component を作る

`app/components/` には、通常の Hono JSX component を作成できます。

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

作成した component は、route や別の component から通常どおり import して利用できます。

### Riebeckite の UI Primitive

記事ページを作るときは、`@riebeckite/honox/ui` が提供する次のような UI Primitive も利用できます。

- `Article`
- `ArticleLayout`
- `ArticleContent`

これらは Riebeckite の記事構造を組み立てるための小さな部品です。

専用の component framework ではないため、必ず使う必要はありません。Site 側で独自の HTML 構造を作ることもできます。

詳しくは [UI Primitive](../framework/honox-integration/ui.ja.md#ui-primitive) を参照してください。

## 記事ページの Layout を変える

starter では、記事ページの主な構成を次の2か所で管理しています。

```text
app/components/article.tsx
app/routes/_renderer.tsx
```

### `app/components/article.tsx`

ここにある `SiteArticle` が、記事ページのレイアウトを決めます。

たとえば、

- 記事タイトルの位置を変える
- 記事の前後に UI を追加する
- breadcrumbs の位置を変える
- backlinks や related posts の位置を変える
- sidebar を追加する

といった変更は、主にここで行います。

`SiteArticle` は `@riebeckite/honox/ui` の `Article` を利用して作られていますが、Site 側の component なので自由に編集できます。

なお、route 内で `Article` という名前で使われているものは、この Site component を指します。`@riebeckite/honox/ui` の `Article` とは別物です。

### `app/routes/_renderer.tsx`

`_renderer.tsx` は、サイト全体を包む外側のレイアウトです。

主に次のものを管理します。

- `<head>`
- Header
- Footer
- Navigation
- ページ全体の共通 UI
- Riebeckite や plugin が生成した head tag / style
- **`RiebeckiteHead` による標準 head contents の描画**

サイト全体に共通する部分を変えたい場合は、こちらを編集します。

標準的な head contents を Framework に任せつつ、カスタム head を追加する例：

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
);
```

詳しくは [Head Tags](../framework/honox-integration/site.ja.md#head-tags) を参照してください。

## Navigation を変える

Header や Footer に表示するリンクは、`riebeckite.config.ts` に登録する
[`@riebeckite/plugin-navigation`](../reference/configuration/navigation.ja.md) Plugin が提供します。

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

モデルを返し、`SiteNav` でツリーを描画するのは Plugin です。描画したリストをどこに置くかは Site が決めます。starter では `app/components/site-header.tsx` が `SiteNav` を使い、`app/routes/_renderer.tsx` が解決済みモデルと現在パスを渡します。そのため、

- **リンクを追加・削除したい** → `navigation({ items })` を変更
- **Vault からリンクを導出したい** → 引数なしの `navigation()`
- **Header の見た目や HTML を変えたい** → `site-header.tsx` を変更
- **Header / Footer 自体の配置を変えたい** → `_renderer.tsx` を変更

と考えると分かりやすいです。

子の再帰描画、現在パスの判定、言語を考慮した正規化、外部リンク、`aria-current` といった描画の仕組みは `SiteNav` にあるため、Site 側で再実装する必要はありません。

設定できる項目については [Configuration リファレンス](../reference/configuration/navigation.ja.md) を参照してください。

## Plugin が作るページやリンク

Riebeckite では、Header / Footer の Navigation とは別に、plugin がページやリンクを追加することがあります。

大きく分けると、次の2種類があります。

### 閲覧するためのページ

たとえば、

- Search
- Tag / Folder 一覧
- Taxonomy のページ
- Feed
- Sitemap

などです。

これらは plugin が必要なページや endpoint を生成します。

有効化しただけで Header や Footer にリンクが追加されるわけではありません。Header に表示したい場合は、通常のページと同じように `navigation` へ追加してください。

### 記事同士をつなぐ UI

たとえば、

- Breadcrumbs
- Backlinks
- Related Posts
- Series の前後リンク
- Local Graph

などです。

これらは主に記事ページの中へ表示されます。

Plugin が提供する UI fragment は `article.header` や `article.footer` などの **Body Slot** を通して配置できます。

つまり、

```text
Header / Footer のリンク
        ↓
riebeckite.config.ts の navigation

検索・Tag・Folder などのページ
        ↓
Plugin の Page Type

Breadcrumbs・Backlinks など
        ↓
Component / Body Slot
```

という違いがあります。

## Route を追加する

`app/routes/` は通常の HonoX route ディレクトリです。

そのため、Site 独自のページも通常どおり追加できます。

たとえば `/about` を作りたい場合は、HonoX の route として追加できます。

一方、Markdown の content や plugin が提供するページについては、基本的に自分で route を追加する必要はありません。

starter の catch-all route が、

- `contentRouteSsgParams`
- `riebeniteSsgParams`
- `resolveRiebeckiteContentRequest`

を利用して、content と plugin の Page Type を自動的に解決します。

Plugin のページを Header や Footer に表示したい場合も、新しい route を作るのではなく `navigation` にリンクを追加します。

## 404（ページが見つからない）

存在しない URL は、HonoX 標準の `_404.tsx` route が処理します。Site 側の通常のファイルなので、これを編集すると「ページが見つからない」画面を変更できます。

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

「見つからない」と判断するのは Riebeckite ですが、描画は `_renderer.tsx` を通るため、404 画面でも Site の Theme、head、Header、Footer がそのまま使われます。押さえておくべき点は2つです。

- status は必ず 404 のままにします。生成される preset は `c.status(404)` を呼びます。見た目を整えた画面を `200` で返してはいけません。
- 見た目は Site のものです。markup、文言、リンク、CSS はすべて Site 側で決められます。Riebeckite が上書き対象となる「デフォルトの 404 component」を用意することはありません。

404 画面に到達するのは「見つからない」リクエストだけです。draft、公開日が未来の content、非公開の content がここへ来ることはないため、404 から非公開 content の存在が漏れることはありません。

### Runtime Error（任意）

Hono の標準の error 処理が error をログに記録し、`500 Internal Server Error` を返すため、Site 側で何かを追加する必要はありません。visitor 向けの error 画面を Site のものとして用意したい場合は、HonoX の `app/routes/_error.tsx`（`ErrorHandler`）を利用できます。生成される preset はこれを追加していません。config、plugin、build の error は開発者向けであり、ページに偽装せずそのまま見えるべきだからです。

## Plugin の Component を使う

Plugin によっては、Site から直接利用できる Hono JSX component を提供しています。

たとえば Backlinks や Table of Contents を Site の好きな場所へ配置できます。

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

利用できる component や props は、それぞれの Plugin ページや package README を確認してください。

多くの component は `./components` から default import することもできます。

```tsx
import Backlinks from "@riebeckite/plugin-backlinks/components";
```

`color-mode` は例外で、`ColorModeScript` と `ColorModeToggle` を package root から公開しています。

### Body Slot を使う Plugin

Plugin によっては component を直接配置するのではなく、記事ページの決められた場所へ HTML を追加するものもあります。

この仕組みが **Body Slot** です。

Plugin を有効にして、Site 側の `SiteArticle` が対応する slot を描画していれば、自動的に表示されます。

詳しくは [Body Slots](../reference/plugin-api.ja.md#body-slots) と [UI の提供方法](../plugins/writing-a-plugin.ja.md#ui-の提供方法) を参照してください。

## 操作できる UI を作る

クリックや状態管理など、ブラウザ側の処理が必要な UI は `app/islands/` に作ります。

これは通常の HonoX island と同じです。

作成した island を route や component から import して利用します。

Riebeckite 専用の island の仕組みがあるわけではありません。

`app/client.ts` では、

```ts
createClient();
initRiebeckiteClient();
```

の両方を初期化します。

`createClient()` は Site の client 処理を初期化し、`initRiebeckiteClient()` は Plugin や Theme が提供する browser-side の処理を起動します。

Site の island は `app/islands/`、Plugin の browser 処理は Plugin 側、というように責務が分かれています。

## CSS を変更する

Site のデザインは、`app/style.css` や各 component の CSS から変更できます。

通常の CSS や Tailwind を利用できます。

Riebeckite が Plugin や Theme から生成した CSS は、Site の CSS から一度だけ読み込みます。

```css
/* app/style.css */
@import "./.riebeckite/framework-styles.css";
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

`app/.riebeckite/` のファイルは自動生成されるため、直接編集しないでください。

Plugin の見た目を上書きするときは `rr-<feature>`、Riebeckite の UI Primitive を調整するときは `rb-*` の CSS hook を利用できます。

詳しくは [CSS Hooks](../reference/plugin-api.ja.md#css-hooks) を参照してください。

## 迷ったときの目安

「どこを変更すればいいか分からない」という場合は、次のように考えると簡単です。

| やりたいこと | 変更する場所 |
| --- | --- |
| Header にリンクを追加したい | `riebeckite.config.ts` |
| Header の見た目を変えたい | `app/components/site-header.tsx` |
| サイト全体の外枠を変えたい | `app/routes/_renderer.tsx` |
| 記事ページの構成を変えたい | `app/components/article.tsx` |
| 独自ページを追加したい | `app/routes/` |
| 404 ページを変えたい | `app/routes/_404.tsx` |
| 独自 component を作りたい | `app/components/` |
| 操作できる UI を作りたい | `app/islands/` |
| 色や余白を変えたい | `app/style.css` |
| Plugin の UI を配置したい | Plugin Component / Body Slot |

Riebeckite が content と plugin を Site へ接続し、**最終的なページの見た目と構成は Site が決める**、というのが基本的な考え方です。

## 次に読むページ

- [HonoX Integration](../framework/honox-integration.ja.md) — Riebeckite と HonoX の接続や UI Primitive
- [プラグイン作成の詳細](../framework/plugin-system.ja.md) — Plugin を作る場合の拡張ポイント
- [Plugin API](../reference/plugin-api.ja.md) — Body Slot、Page、Asset、CSS Hook の詳細
