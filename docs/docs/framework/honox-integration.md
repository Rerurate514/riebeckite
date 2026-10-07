# HonoX Integration

`@riebeckite/honox` は、Riebeckite Core と HonoX / Vite を接続する integration です。

Core はコンテンツやプラグインの処理を担当しますが、HonoX の route や Vite の build 方法については知りません。

その間を接続するのが `@riebeckite/honox` です。

```mermaid
flowchart LR
    A["Riebeckite Core<br/>Content / Plugin / Manifest"]
    B["@riebeckite/honox<br/>Integration"]
    C["HonoX / Vite<br/>Application"]

    A --> B
    B --> C
```

主に次の処理を担当します。

- application root / config の解決
- Vite の development / build
- SSG の設定
- plugin / theme の style entry 生成
- client entry の生成
- Riebeckite のコンテンツと HonoX application の接続

これにより、通常の Site は Riebeckite 内部の Vite / HonoX 設定を毎回組み立てる必要がありません。

## 基本的な使い方

通常は `vite.config.ts` で `riebeckiteVite()` を登録します。

```ts
import { riebeckiteVite } from "@riebeckite/honox";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honox({ ... }), ...riebeckiteVite(), build()],
});
```

`riebeckiteVite()` は通常の Site 向けの higher-level helper です。

Riebeckite の Vite plugin を追加するだけでなく、次の設定もまとめて行います。

- SSG entry の設定
- extension mapping
- SSR に必要な external dependency の設定
- plugin / theme の生成 entry の接続

HonoX plugin、deployment 用 build plugin、Tailwind など、Site 自身が必要とする Vite plugin と組み合わせて利用できます。

## Root と Config

`riebeckiteVite()` では、必要に応じて次の場所を指定できます。

| Option | 意味 |
| --- | --- |
| `appRoot` | Site application の基準ディレクトリ |
| `configRoot` | Riebeckite config を探す基準 |
| `configFile` | 使用する config file |
| `workspaceRoot` | monorepo 開発時の workspace root |

通常は指定する必要はありません。

`appRoot` の既定値は Vite root、`configRoot` の既定値は `appRoot` です。

Riebeckite config は `configRoot` を基準に読み込みます。

一方、

```ts
content: {
  directory: "./content",
}
```

のような content directory は `appRoot` を基準に解決します。

`resolveHonoxApplication()` は、これらの root と解決済み config をまとめて返します。

CLI と Vite がこの共通モデルを利用することで、それぞれが異なる方法で application を解決しないようにしています。

### `workspaceRoot`

`workspaceRoot` は、Riebeckite 自体を monorepo で開発するときに source package alias を利用するための設定です。

npm から Riebeckite をインストールした通常の Site では必要ありません。

その場合は Site 自身の `node_modules` から package が解決されます。

## `.riebeckite` に生成されるファイル

Integration は application 内の

```text
app/.riebeckite/
```

へ、plugin や theme を接続するためのファイルを生成します。

たとえば plugin style や theme style です。client module は `.riebeckite` には生成されず、virtual module として提供されます。

```mermaid
flowchart LR
    A["Installed Plugins / Themes"]
    B["@riebeckite/honox"]
    C["app/.riebeckite/"]
    D["Site Application"]

    A --> B
    B -->|"generated entries"| C
    C --> D
```

`.riebeckite` は integration が管理する生成物です。

**Site の source code として直接編集しないでください。**

## Lower-level API

より細かく integration を制御したい場合は、lower-level API も利用できます。

- `riebeckite`
- `riebeckiteSsg`
- `riebeckiteSsgExtensionMap`
- `createRiebeckiteSsg`

通常の Site では `riebeckiteVite()` を利用し、独自の build integration が必要な場合のみ lower-level API を利用してください。

## Routing と SSG

HonoX の runtime routing と静的生成では、同じ URL が同じページとして扱われる必要があります。

特に catch-all route がある場合、SSG の route 列挙に注意が必要です。

Riebeckite はこのために2つの helper を提供します。

### `contentRouteSsgParams`

```ts
contentRouteSsgParams(routePath, params)
```

`hono/ssg` の `ssgParams` の代わりとして使用します。

この helper は、その route 自身に属する params だけを返します。

たとえば、

```text
/:slug{.+}
```

という catch-all route があっても、

```text
/tags/:slug{.+}
```

に属するページまで横取りしません。

### `ssgEnumerableHandler`

```ts
ssgEnumerableHandler(handler)
```

`next()` を使って sibling route に処理を渡す handler を、SSG の列挙対象として残すための helper です。

Hono は middleware 形式の handler を通常 SSG の列挙対象から外すため、この差を補います。

## Plugin Page

Plugin は通常の content とは別に、独自のページを提供できます。

その場合は、

```ts
resolveContentRoute(manifest, path)
```

ではなく、

```ts
resolveRiebeckiteRoute(content, path)
```

を使用します。

SSG params には、

```ts
pluginPageSsgParams(content)
```

を追加します。

生成された Site の catch-all route は、これらをまとめた `resolveRiebeckiteContentRequest(c, content)` を使用します。この helper が content / Plugin Page / redirect / not-found を解決し、`htmlLanguage` と `headTags` を context へ設定するため、Site は返された結果を自身の composition に渡すだけで済みます。

Route resolver は次の順序で URL を解決します。

```mermaid
flowchart TD
    A["Request Path"]
    B{"Plugin Page?"}
    C["Plugin Page"]
    D{"Content?"}
    E["Content"]
    F{"Redirect?"}
    G["Redirect"]
    H["Not Found"]

    A --> B
    B -->|Yes| C
    B -->|No| D
    D -->|Yes| E
    D -->|No| F
    F -->|Yes| G
    F -->|No| H
```

Plugin Page の body は意図的に文字列として扱います。

Site が持つ既存の document frame 内へ描画し、`page.headTags` も Site の frame へ渡します。

この仕組みにより、Plugin が独自ページを提供するためだけに HonoX の route file を追加する必要はありません。

# UI Primitive

`@riebeckite/honox/ui` は UI framework ではありません。

Site が独自のデザインを作りながら、Riebeckite と共通の HTML 構造を利用するための小さな primitive set です。

公開されている主な component は次のとおりです。

- `Article`
- `ArticleLayout`
- `ArticleHeader`
- `ArticleContent`
- `ArticleBody`
- `PageBody`
- `ArticleMeta`
- `ArticleFooter`
- `ContentSlot`
- `Sidebar`

対応する `*Props` 型も公開されています。`ContentSlot` には `hasSlot(slots, name)` という純粋 helper が対応し、`ARTICLE_SLOT` 定数が標準 slot 名を提供します。

## Stable Styling Hooks

各 primitive は次の class を stable styling hook として提供します。

| Component | Class |
| --- | --- |
| `Article` | `rb-article` |
| `ArticleLayout` | `rb-article-layout` |
| `ArticleHeader` | `rb-article-header` |
| `ArticleContent` | `rb-article-body` |
| `ArticleBody` | `rb-article-content` |
| `ArticleMeta` | `rb-article-meta` |
| `ArticleFooter` | `rb-article-footer` |
| `Sidebar` | `rb-sidebar` |

`ArticleBody` はレンダリング済み Markdown 本文を `.rb-article-content` として描画し、Markdown typography はこの wrapper にのみ適用されます。plugin component の見出しは plugin 自身が所有します。

`ContentSlot` は `slots` map から slot 名で HTML fragment を取り出し、`data-slot` を付けて描画します。存在しない slot、空文字、whitespace のみの slot は何も描画しません。`class` / `className` で Site 固有 class を追加できます。slot 名から semantic 要素を推測するような暗黙の mapping は行いません。

Primitive が担当するのは主に、

- semantic HTML
- stable styling hook
- `class` / `className` の合成

です。

一方、

- 記事本文の見せ方
- metadata の表示形式
- navigation
- card
- page layout
- island
- CSS

は Site Application が管理します。

## 使用例

```tsx
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleLayout,
  ContentSlot,
} from "@riebeckite/honox/ui";

<Article class="site-article">
  <ArticleLayout>
    <ContentSlot
      slots={bodySlots}
      name="article.aside"
      class="site-article__aside"
    />
    <ArticleContent>
      <ContentSlot slots={bodySlots} name="article.header" />
      <ContentSlot slots={bodySlots} name="article.metadata" />
      <ArticleBody html={post.html ?? ""} />
    </ArticleContent>
  </ArticleLayout>
</Article>;
```

`ArticleHeader` と `ArticleContent` は、children と HTML input prop のどちらか一方だけを受け取ります。レンダリング済み Markdown 本文は `ArticleBody` に渡してください。`ArticleContent html={...}` は後方互換のために残っていますが非推奨です。

Primitive は composition point として使用し、見た目は Site 側で定義してください。

また、

```text
@riebeckite/honox/src/
```

以下を直接 import しないでください。

公開 API として記載されていない内部 component に依存することも避けてください。

# Site Application の責務

Riebeckite Site は、最終的には通常の HonoX application です。

`@riebeckite/honox` は content と build を接続しますが、実際にユーザーが見る UI の設計は Site が管理します。通常の HonoX で編集する手順は [サイトのカスタマイズ](../guides/customizing-your-site.md) を参照してください。

```mermaid
flowchart TD
    A["Riebeckite Core<br/>content / manifest / plugin"]
    B["@riebeckite/honox<br/>build / routing integration"]
    C["Site Application"]

    C --> D["app/routes/<br/>URL / page composition"]
    C --> E["app/components/<br/>Site UI"]
    C --> F["app/islands/<br/>Interactive UI"]
    C --> G["app/style.css<br/>Visual Design"]

    A --> B
    B --> C
```

主なディレクトリの責務は次のとおりです。

| ディレクトリ | Site が持つ責務 |
| --- | --- |
| `app/routes/` | URL処理、ページ構成、redirect、response metadata |
| `app/components/` | Site 固有の UI |
| `app/islands/` | 対話 UI と client-side state |
| `app/style.css` | 色、layout、typography、extension style |

## Site Shell

```text
app/routes/_renderer.tsx
```

は Site 全体の shell です。

ここでは主に、

- document head
- navigation
- page chrome
- application client entry

などを管理します。

Route は `ContentManager` からコンテンツを取得し、

```ts
resolveRiebeckiteRoute(content, c.req.path)
```

で request URL を解決します。

その結果をどの component tree で表示するかは Site が決定します。

Riebeckite repository にある `apps/web` は実装例の1つであり、外部 Site が同じ layout を使う必要はありません。

# Plugin と Site の境界

Plugin は Site に情報や UI fragment を提供できます。

ただし、**最終的にどこへ描画するかは Site が決定します。**

```mermaid
flowchart LR
    A["Plugin"]
    B["Manifest"]
    C["Site Route"]
    D["Site Shell / Component"]

    A -->|"headTags / bodySlots / page"| B
    B --> C
    C -->|"placement"| D
```

## Head Tags

Plugin が document head に情報を追加したい場合は、

```ts
ContentManifestEntry.headTags
```

へ `meta` / `link` / `script` を記述します。

Plugin 自身が `<head>` を描画するわけではありません。

Site の route が、

```ts
c.set("headTags", entry.headTags ?? []);
```

として shell へ渡し、`_renderer.tsx` が描画します。

```tsx
import { PluginHeadTags } from "@riebeckite/honox/ui";

const headTags = c.get("headTags") ?? [];

<head>
  <PluginHeadTags tags={headTags} />
</head>;
```

つまり、

```text
Plugin
  ↓ headTags を提供
Route
  ↓ shell へ渡す
_renderer.tsx
  ↓
<head> に描画
```

という関係です。

たとえば `@riebeckite/plugin-discord-embed` は、この仕組みを使って `theme-color` を提供します。

Plugin は `<head>` 自体や tag の並び順を所有しません。

## RiebeckiteHead と PluginHeadTags

`@riebeckite/honox/ui` より公開される 2 つの primitive は、head composition の責務分離を明確にします。

### `RiebeckiteHead`

```tsx
import { RiebeckiteHead } from "@riebeckite/honox/ui";

<RiebeckiteHead title="My Site" headTags={[]} />
```

Framework が次の標準的な head contents を描画します。

- `<meta charset="utf-8">`
- `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
- `<title>`（title prop が提供する値）
- `<link rel="icon" href="/favicon.ico">`（faviconHref プロップで上書き可能、null で省略可）
- `<ColorModeScript />`（colorModeScript プロップで制御、default true）
- stylesheet entries（stylesheets プロップ、default `["/app/style.css"]`）
- client script entry（clientSrc プロップ、default `"/app/client.ts"`、null で省略可）
- `PluginHeadTag` values の変換（headTags プロップ）
- 子要素（children prop）は標準の後に追加

`RiebeckiteHead` は `<head>` 要素自身を描画しません。Site は `<head>` の ownership を保持し、その中に `RiebeckiteHead` を配置できます。

### `PluginHeadTags`

```tsx
import { PluginHeadTags } from "@riebeckite/honox/ui";

<PluginHeadTags tags={headTagsFromManifest} />
```

`PluginHeadTag` values (meta / link / script) を JSX 要素に変換します。`RiebeckiteHead` を使わず、Site が自分で head を組み立てる際に使用します。

### 使用例

Site が `<head>` 所有権を維持しつつ標準 head をFrameworkに任せる場合：

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

Frameworkは標準 head rendering メカニクス（charset、viewport、default title、favicon wiring、color-mode bootstrap、stylesheet/client entry wiring、PluginHeadTag 変換）と theme-root attribute 導出を担当し、Site は `<head>`/`<body>` 構成とカスタム meta/link/script の所有権を保持します。favicon FILE (`/public/favicon.ico`) は Site-owned のまま、default link wiring にのみ Framework が所有権を持ちます。

Plugin が head tags を提供する場合は、既存の `headTags` メカニズムはそのまま機能します。`RiebeckiteHead` と `headTags` は併用可能です。

## Body Slots

本文の途中へ Plugin の HTML を表示したい場合は、

```ts
ContentManifestEntry.bodySlots
```

を使用します。

Plugin は slot 名と HTML fragment を提供します。

たとえば、

```text
properties
```

という slot があれば、Route は slot object を article component へ渡し、Site は、

```tsx
<Article
  content={post}
  bodySlots={route.entry.bodySlots}
/>
```

のように article component 内の任意の位置へ配置できます。

ここでの `Article` は Site 自身の article component であり、同名の `@riebeckite/honox/ui` primitive ではありません。scaffold の starter は標準 slot を決まった位置へ描画します(`article.aside`、`article.header`、`article.metadata`、`article.before-content`、`article.after-content`、`article.footer`)。plugin 作者はこれらから選ぶか、Site に独自名の描画を依頼します。独自 slot は Site が描画を選ぶまで何も表示しません。

Site はどの slot をどこへ置くかを選び、描画の仕組みは公開 `ContentSlot` primitive に任せます。

```tsx
<ArticleContent>
  <ContentSlot slots={bodySlots} name="article.header" />
  <ContentSlot
    slots={bodySlots}
    name="article.metadata"
    class="site-article__metadata"
  />
  <ArticleBody html={post.html ?? ""} />
</ArticleContent>
```

`ContentSlot` は slot lookup、存在しない slot や空 slot の扱い、HTML fragment の描画、`data-slot` の付与を担当します。Site が `dangerouslySetInnerHTML` を直接書く必要はありません。順序、可視性、Site 固有 class、独自 slot 名は引き続き Site が所有します。`slots` を直接読んだり、任意の wrapper で包んだり、同じ slot を複数回描画する escape hatch も残っています。

Plugin が route や shell の構造を書き換える必要はありません。

`@riebeckite/plugin-properties` では、

```ts
render: "slot"
```

を指定すると `properties` slot を提供します。

`render: "html"` は従来どおり、生成 HTML の先頭または末尾へ直接挿入します。

記事末尾の Plugin section は `article.footer` に集約します。article component ではこの slot を一度だけ描画し、fragment の順序は解決済み Plugin の `order` で決めます。空の contribution は DOM node を生成しません。

# 独自 Site を作る

外部 Site でも、公開 primitive を使いながら自由に component を構成できます。

```tsx
import type { ContentBodySlots, PostContent } from "@riebeckite/core";
import {
  Article,
  ArticleBody,
  ArticleContent,
  ArticleLayout,
  ContentSlot,
} from "@riebeckite/honox/ui";

export function SiteArticle({
  post,
  bodySlots,
}: {
  post: PostContent;
  bodySlots?: ContentBodySlots;
}) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        <ArticleContent>
          <ContentSlot slots={bodySlots} name="article.header" />
          <ArticleBody html={post.html ?? ""} />
          <ContentSlot slots={bodySlots} name="article.footer" />
        </ArticleContent>
      </ArticleLayout>
    </Article>
  );
}
```

見た目は Site の CSS で定義します。

```css
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";

.site-article {
  max-width: 48rem;
  margin: 0 auto;
}
```

`.riebeckite` 内の生成 CSS 自体を直接編集しないでください。

## Islands

Island も通常の Site module として管理します。

```text
app/islands/
```

へ HonoX island を配置し、それを利用する route または component から import します。

hydration や client-side state は Site 内で管理します。

`app/client.ts` では、

```ts
createClient();
initRiebeckiteClient();
```

の両方を初期化します。

`initRiebeckiteClient()` は、インストールされている Plugin や Theme が提供する browser entry を起動するために使用されます。

Plugin は client entry を提供できますが、

- Site route
- shell
- component
- island
- CSS design

そのものを所有してはいけません。

# Integration の境界

Riebeckite の routing では、すでに解決された公開 URL を使用します。

基本的には、

```text
byPermalink
    ↓
redirects
```

の順で request を解決します。

filesystem path やディレクトリ構造から公開 URL を逆算しません。

また、`slug` はコンテンツを内部で検索するためのキーです。

実際に公開される URL は、解決済みの `permalink` です。

## 責務のまとめ

Riebeckite 全体では、次のように責務を分離します。

```mermaid
flowchart LR
    Core["Core<br/>Content / Manifest / Plugin API"]
    Integration["HonoX Integration<br/>Vite / SSG / Route Resolution"]
    Plugin["Plugin<br/>Content Extension / Page / Asset / Client Entry"]
    Site["Site Application<br/>Route / Shell / UI / Island / CSS"]

    Core --> Integration
    Plugin --> Core
    Integration --> Site
    Plugin -. "提供した情報を<br/>Site が配置" .-> Site
```

HonoX / Vite / Cloudflare 固有の処理は integration または Site Application に閉じます。

Core は HonoX routing を所有しません。

Plugin はページ、アセット、client entry などを提供できますが、Site 全体の route composition や UI 構造は所有しません。

**Core はコンテンツを扱い、Integration は HonoX と接続し、Plugin は機能を提供し、Site が最終的な表示を決める**、という境界を維持してください。

build state の扱いについては [Build system](build-system.md)、package ごとの責務については [Architecture](architecture.md) を参照してください。
