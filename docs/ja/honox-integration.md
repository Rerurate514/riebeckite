# HonoX Integration

`@riebeckite/honox` は portable な Core と HonoX/Vite を接続します。application root/config の解決、Vite dev/build、SSG extension mapping、plugin/theme style entry の生成、HonoX application build workflow を所有します。

## Public API

`vite.config.ts` では `riebeckiteVite()` で integration を登録します。通常の Site 向けの higher-level helper で、Riebeckite の plugin を追加し、SSG の entry と extension map の既定値を適用し、runtime が必要とする SSR externals を設定します。Site が Vite/HonoX の内部知識を書き直す必要はありません。Site 自身の plugin（HonoX plugin、deployment 用 build plugin、Tailwind など）と組み合わせて使います。

```ts
import { riebeckiteVite } from "@riebeckite/honox";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [honox({ ... }), ...riebeckiteVite(), build()],
});
```

`riebeckiteVite` は lower-level plugin と同じ任意の `configRoot`、`appRoot`、`configFile`、monorepo 開発専用の `workspaceRoot` を受け取ります。`appRoot` の既定値は Vite root、`configRoot` の既定値は `appRoot` です。config は `configRoot` 基準で import し、`content.directory` は `appRoot` 基準で解決します。`resolveHonoxApplication` はこれらの root と resolve 済み config をまとめて返すため、CLI と Vite は同じ model を使います。`workspaceRoot` は monorepo で source package alias を使うためだけの指定です。npm で install した consumer は指定不要で、自身の `node_modules` から解決します。integration は `app/.riebeckite/` に plugin/theme import entry を生成し、client module を設定します。このディレクトリは integration output であり、application source として直接編集しません。

full control が必要な場合は lower-level の API も公開しています。`riebeckite`（Vite plugin）、`riebeckiteSsg`（静的生成）、`riebeckiteSsgExtensionMap`、`createRiebeckiteSsg`（Riebeckite の既定値を埋める SSG wrapper）です。`riebeckiteSsg` は内部の Vite server に解決済みの application root と define 値を渡すため、`riebeckite build` を application root の子ディレクトリから実行しても同じ出力になります。`defaultSsgEntry` は root 基準の `./app/server.ts`、`defaultSsrExternals` は両 helper が使う SSR externals list です。その他に `loadRiebeckiteConfig`、`resolveHonoxApplication`、`resolveHonoxApplicationRoot`、`buildHonoxApplication`、`startHonoxDevServer` を公開しています。加えて `scaffoldRiebeckiteSite({ targetDirectory, name?, siteTitle?, description?, baseUrl?, locale?, overwrite? })` は、最小で自己完結の Site（config、Vite/HonoX の application shell、route、stylesheet、初期 content）を書き出し、生成したファイル一覧を返します。生成対象のファイルが既にあり `overwrite` が未指定の場合は `ScaffoldSiteError` を投げます。`riebeckite init` と `create-riebeckite` はこの関数の薄い command wrapper です。

## UI primitive

`@riebeckite/honox/ui` は component framework ではなく、意図的に小さく保った構造用 contract です。公開する component は次だけです。

- 記事ページ用の `Article`、`ArticleLayout`、`ArticleHeader`、`ArticleContent`、`ArticleMeta`、`ArticleFooter`
- 補助コンテンツ用の `Sidebar`

各 component に対応する `*Props` 型も公開します。contract として提供する stable styling hook は、上記の順に `rb-article`、`rb-article-layout`、`rb-article-header`、`rb-article-body`、`rb-article-meta`、`rb-article-footer`、`rb-sidebar` だけです。primitive が提供するのは semantic HTML、これらの hook、`class` / `className` の合成だけです。記事本文、metadata の表示形式、navigation、card、ページ layout、island、CSS は Site Application が所有します。`ArticleHeader` と `ArticleContent` は children または HTML input prop のいずれか一方だけを受け取ります。

```tsx
import {
  Article,
  ArticleContent,
  ArticleHeader,
  ArticleLayout,
  ArticleMeta,
} from "@riebeckite/honox/ui";

<Article class="prose">
  <ArticleLayout aside={<nav>…</nav>}>
    <ArticleContent>
      <ArticleHeader dangerouslySetInnerHTML={{ __html: lead }} />
      <ArticleMeta>…</ArticleMeta>
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </ArticleContent>
  </ArticleLayout>
</Article>;
```

primitive は composition point として使い、style は Site 側で定義します。`@riebeckite/honox/src/` 以下を import したり、ここに挙げていない component に依存したりしないでください。

## Site Application の拡張 contract

Riebeckite の Site は通常の HonoX application です。integration が担当するのは content と build の接続であり、利用者に見える設計はすべて Site が決めます。次のディレクトリは integration、theme、plugin ではなく、Site 内で管理します。

| ディレクトリ | Site が持つ責務 |
| --- | --- |
| `app/routes/` | URL の処理、ページの組み立て、redirect、response metadata |
| `app/components/` | Site 固有の表示部品と、公開 UI primitive の組み合わせ |
| `app/islands/` | 任意の対話 UI と client-side state |
| `app/style.css` とローカル CSS | visual token、layout、typography、生成済み extension style の import |

`app/routes/_renderer.tsx` は Site の shell です。document head、navigation、page chrome、application client entry はここで管理します。route は `ContentManager` から post を取得し、`resolveContentRoute(manifest, c.req.path)` で request URL を解決したうえで、どの component tree を描画するかを Site 側で決めます。`apps/web` はその一例であり、同じ layout を使う必要はありません。

たとえば外部 Site では、stable な primitive contract を使いつつ、表示は Site 側で自由に組み立てられます。

```tsx
// app/components/article.tsx
import type { PostContent } from "@riebeckite/core";
import { Article, ArticleContent, ArticleLayout } from "@riebeckite/honox/ui";

export function SiteArticle({ post }: { post: PostContent }) {
  return (
    <Article class="site-article">
      <ArticleLayout>
        <ArticleContent html={post.html ?? ""} />
      </ArticleLayout>
    </Article>
  );
}
```

生成された extension style は Site の stylesheet から import します。生成ファイル自体は編集しません。

```css
/* app/style.css */
@import "./.riebeckite/plugin-styles.css";
@import "./.riebeckite/theme-styles.css";

.site-article { max-width: 48rem; margin: 0 auto; }
```

island も通常の Site module です。`app/islands/` に HonoX island を置き、それを所有する route または component から import します。hydration と client state は Site 内に閉じます。`app/client.ts` では `createClient()` と `initRiebeckiteClient()` の両方を初期化し続けてください。後者は install 済み plugin と theme が提供する browser entry を開始します。plugin は client entry を追加できますが、Site の route、shell、component、island、CSS の設計を所有してはいけません。

external-site E2E fixture には、最小の Site shell、`@riebeckite/honox/ui` で組んだローカル article component、ローカル island、Site CSS を置いています。この fixture は npm tarball だけで build するため、これらの境界を copy・override する際のサポート対象の例です。

記事 routing は、manifest に既に解決済みの public location（`byPermalink`、次に `redirects`）に対して request を解決します。filesystem path、directory layout、slug から URL を逆算しません。slug は content の内部 lookup key であり、public URL は解決済みの `permalink` です。

HonoX/Vite/Cloudflare/route API はこの integration か `apps/web` に閉じます。Plugin は asset、client entry、endpoint、renderer を公開できますが、Core は HonoX routing を所有しません。実際の route composition と island は application の責務です。
