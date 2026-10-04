# サイトのカスタマイズ

Riebeckite Site は、最終的には通常の HonoX application です。見た目や振る舞いを変えるために、Riebeckite 独自のフロントエンド framework を覚える必要はありません。Riebeckite は content、manifest、plugin の接続を提供し、`app/` は自分で管理する通常の HonoX application です。

このページは、Site が所有する範囲と、通常の HonoX / Hono JSX でそれを変える方法をまとめた地図です。HonoX の tutorial ではないため、framework 自体は HonoX の documentation を参照してください。

## Site code を置く場所

| ディレクトリ | Site が持つ責務 |
| --- | --- |
| `app/routes/` | URL 処理、ページ構成、redirect、response metadata |
| `app/components/` | Site 固有の UI と、公開 UI primitive の組み合わせ |
| `app/islands/` | 対話 UI とその client-side state |
| `app/style.css` とローカル CSS | 色、layout、typography、生成される extension style |

`app/` 以下は application source です。integration は `app/.riebeckite/` に生成物を出力します。これは build output として扱い、source として編集しないでください。

## Component

`app/components/` には通常の Hono JSX component を書けます。特別な準備は必要ありません。

```tsx
// app/components/callout.tsx
export function Callout({ children }: { children?: unknown }) {
  return <aside class="callout">{children}</aside>;
}
```

Riebeckite が文書化している article 構造を使いたい場合は、公開 primitive である `@riebeckite/honox/ui`(`Article`、`ArticleLayout`、`ArticleContent` など)を組み合わせます。これは意図的に小さな構造 contract であり、component framework ではありません。使わずに独自の markup を書いてもかまいません。詳しくは [UI Primitive](../framework/honox-integration.md#ui-primitive) を参照してください。

## Layout

article の layout は Site が所有します。scaffold の starter では `app/components/article.tsx`(`SiteArticle` component)がそれにあたり、document shell は `app/routes/_renderer.tsx` です。

`SiteArticle` は公開 component ではなく Site component です。`@riebeckite/honox/ui` の `Article` primitive を包み、各 body slot をどこへ描画するかを決めます。article 構造を変えたり、見出しを足したり、plugin fragment の位置を動かしたりと自由に編集できます。route の例に現れる `Article` はこの Site component であり、同名の primitive ではありません。

`app/routes/_renderer.tsx` は shell です。document の `<head>`、navigation、page chrome を所有し、integration が渡す head tag や生成 style を描画します。詳しくは [Head Tags](../framework/honox-integration.md#head-tags) を参照してください。

## Route

`app/routes/` は通常の HonoX route ディレクトリです。たとえば `/about` ページのように、route を追加・削除・組み替えられます。content と plugin page は scaffold が用意する catch-all route を通ります。この route は `@riebeckite/honox` の `resolveRiebeckiteRoute`、`contentRouteSsgParams`、`pluginPageSsgParams` を使います。これらが content と plugin の Page Type を解決するため、plugin page を表示するためだけに route を追加する必要はありません。

## Plugin Component

多くの plugin は Hono JSX component を公開しており、Site の好きな場所へ配置できます。package から component を import し、自分の component tree 内で描画します。

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

各 component は package の `./components` subpath の default export でもあるため、`import Backlinks from "@riebeckite/plugin-backlinks/components"` でも利用できます。例外は `color-mode` で、`ColorModeScript` と `ColorModeToggle` を package root からのみ公開します。component 名、props、data helper は plugin ページと package README を確認してください。

component ではなく、または component に加えて、body slot へ HTML fragment を提供する plugin もあります。その場合は plugin を有効化し Site が slot を描画すれば自動で表示されます。[Body Slots](../reference/plugin-api.md#body-slots) と、作者向けの [UI の提供方法](../plugins/writing-a-plugin.md#ui-の提供方法) を参照してください。

## Island

状態や interaction が必要なときは、`app/islands/` に通常の HonoX island を置き、それを利用する route または component から import します。hydration と client-side state は Site 内に閉じます。`app/client.ts` では `createClient()` と `initRiebeckiteClient()` の両方を初期化します。`initRiebeckiteClient()` は、インストール済み plugin や theme が提供する browser entry を起動します。plugin は `app/islands/` を所有しませんし、plugin 用の island registry もありません。

## Styling

`app/style.css` やローカル CSS で、通常どおり CSS や Tailwind を使えます。生成される extension style は一度だけ import します。

```css
/* app/style.css */
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";
```

`app/.riebeckite/` の生成物は編集しないでください。plugin の出力は、文書化された `rr-<feature>` root hook、UI primitive は `rb-*` の構造 hook で style します。詳しくは [CSS Hooks](../reference/plugin-api.md#css-hooks) を参照してください。

## 次に読むページ

- [HonoX Integration](../framework/honox-integration.md) — Site application の contract と UI primitive
- [プラグイン作成の詳細](../framework/plugin-system.md) — Plugin 作者向けの拡張ポイント
- [Plugin API](../reference/plugin-api.md) — Body Slot、Page、Asset、CSS Hook の正確な contract
