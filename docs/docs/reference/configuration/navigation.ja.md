---
title: ナビゲーションの設定
sidebar:
  label: ナビゲーションの設定
  order: 10
---
# Navigation の設定

Navigation はトップレベルの Config 項目ではなく、**`@riebeckite/plugin-navigation`** Plugin が提供します。Plugin は `{ primary, secondary }` という意味的なモデルを返し、`SiteNav` を通じて描画の仕組みを持ちます。**Site がそれぞれのリストをどこに配置するか**を決めます。`primary` と `secondary` は目立たせ方の違いを表すもので、配置そのものではありません。Plugin API に `header` / `footer` というキーはありません。

```ts
import { defineConfig } from "@riebeckite/core";
import { navigation } from "@riebeckite/plugin-navigation";

export default defineConfig({
  site: { title: "My site", baseUrl: "https://example.com" },
  plugins: [navigation()],
});
```

## 描画

`@riebeckite/plugin-navigation` の `SiteNav` は、解決済みのツリーを標準の `rb-nav` 構造で描画し、現在パスの判定、言語を考慮した正規化、`aria-current` を提供します。ツリーをどこに置くかは Site が決めます。

```tsx
import { SiteNav } from "@riebeckite/plugin-navigation";

<SiteNav
  items={model.primary}
  path={c.req.path}
  language={c.get("htmlLanguage")}
/>;
```

`localizeHref` を渡すと href を書き換えられます（たとえば docs リンクのローカライズ）。`label` でランドマークのラベルを、`class` / `className` で `<nav>` のクラスを拡張できます。

## 引数なしの導出

引数なしで呼び出すと、Vault の **discoverable entries**（`manifest.discoverableEntries`。public かつ discoverable で、draft や非 routable な Content を除く）から `primary` を導出します。専用の Vault ファイルを要求せず、既存の Riebeckite の情報を再利用します。

- folder 構造（folder はセクションになり、ネストした folder は `children` になります）
- README / index の解決（`index` または `README` のノートがその folder を表し、folder の `href` になります）
- README / index を持たない folder は、リンクを持たない label になります
- ルート直下の README / index は Navigation には現れません
- ページの `title`（無い場合は slug のセグメントを整形）
- `permalink`

**Riebeckite 専用の Vault ファイル（`navigation.md` など）も、必須の frontmatter も必要ありません。**

導出は表示中の言語に追従します。`l10n` Plugin が付与する言語 metadata をもとに同じ翻訳の entry をひとつの項目へ集約し、現在の言語の `href` だけを使います。`/ja/guide/` を表示しているときに `/en/...` が混ざることはありません。`l10n` を使っていない Vault では、これまでどおり全 entry が対象になります。

## 手動リンクと補助リンク

`items` を渡すと、導出された `primary` を置き換えます。`secondary` には、Site がより控えめに表示する補助リンクを渡します。

```ts
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
  secondary: [
    { label: "GitHub", href: "https://github.com/example/site", external: true },
  ],
});
```

## NavigationItem

各リンクは `NavigationItem` として設定します。

| Field | 型 | 説明 |
| --- | --- | --- |
| `label` | `string` | リンクに表示する名前 |
| `href` | `string` | 遷移先の path または URL |
| `children` | `NavigationItem[]` | 子項目。サブメニューとして表示されます |
| `external` | `boolean` | `true` の場合は別タブで開きます |

手動指定の item では `label` と `href` が必須です。index ノートを持たない導出 folder は label のみで描画されるため、導出モデルでは `href` は省略可能です。

## 配置

配置は Plugin ではなく Site の shell が決めます。Reference Site では `primary` を header、`secondary` を footer に表示します。Site タイトルがすでに Home へのリンクになっている shell では、`href: "/"` の item を表示しないことがあります。

## サブメニューを作る

`children` を使うと、Navigation を入れ子にできます。

```ts
{
  label: "Notes",
  href: "/notes/planning",
  children: [
    { label: "Planning", href: "/notes/planning" },
    { label: "Writing", href: "/notes/writing" },
  ],
}
```

`children` はサブメニューとして表示されます。

## 外部サイトへリンクする

外部サイトへのリンクには `external: true` を指定できます。

```ts
{
  label: "GitHub",
  href: "https://github.com/example/site",
  external: true,
}
```

この場合は別タブで開き、リンクに `rel="noreferrer"` が付きます。

## 現在のページを示す

現在表示しているページに対応するリンクが自動的に active になります。

たとえば、

```ts
{ label: "Guide", href: "/guide" }
```

という項目がある場合、次のようなページで active になります。

```text
/guide
/guide/getting-started
/en/guide
/en/guide/getting-started
```

末尾の `/` や先頭の locale は判定時に調整されるため、`/guide/` と `/en/guide` のような違いを意識する必要はありません。

active なリンクには `aria-current="page"` が付きます。

外部 URL など `/` から始まらない `href` と、`external: true` の項目は active 判定の対象になりません。

## モバイルでの表示

画面が狭い場合、Site の Navigation は `Menu` から開閉できる表示になります。

Navigation の内容や HTML 構造が別のものになるわけではなく、画面幅に応じて CSS で表示方法が変わります。

## 設定の検証

`navigation` の Option は Plugin の読み込み時に検証されます。

主な条件は次のとおりです。

- `label` は空でない文字列
- `href` は空でない文字列
- `external` を指定する場合は `boolean`
- `children` に祖先の項目を含めることはできない

不正な設定は Plugin の読み込み時にエラーになります。

## Plugin のページは自動追加されない

Plugin は Vault の discoverable entries からリンクを導出します。Plugin が生成するページを自動で surface することはありません。

たとえば、次のようなものは自動的には追加されません。

- Search
- Tag / Folder 一覧
- Taxonomy のページ
- Plugin の Page Type
- Breadcrumbs
- Backlinks
- Related Posts
- その他の Content graph 機能

Plugin が作るページを表示したい場合は、そのページへのリンクを `navigation({ items })` に追加してください。

Navigation と Plugin の役割の違いについては、[サイトのカスタマイズ](../../guides/customizing-your-site.ja.md#navigation-を変える) を参照してください。

## エクスポートされる helper と型

`@riebeckite/plugin-navigation` は `navigation`、`buildNavigation`、`resolveSiteNavigation`、`NAVIGATION_PLUGIN_NAME`、描画 primitive の `SiteNav` と、型 `NavigationItem`、`NavigationOptions`、`SiteNavigation`、`SiteNavProps` をエクスポートします。
