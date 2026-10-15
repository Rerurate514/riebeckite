---
title: UI コンポーネント移行
---
# UI コンポーネント移行

## 1. 状態と判断

**Phase 1 の基盤 API の判断は READY です。** 本書は Slot UI を廃止するための設計基準です。Phase 0 では文書だけを変更し、実行時の挙動は変えません。後続の Phase では `ContentSlot`、`bodySlots`、`ARTICLE_SLOT`、`appendContentBodySlot` を別 API で温存せず、削除します。

## 2. 対象と対象外

目標は Site が UI を組み立てる構成です。Plugin は型付きのデータ取得 API とコンポーネントを公開し、表示するか、どこに置くか、何回置くかは Site が決めます。Markdown の処理、Plugin の Page Type、asset、endpoint、head tag は置き換えません。既存の HTML Page Type を最初の移行で全て JSX にすることも対象外です。

## 3. 現状監査

`ContentManifestEntry.bodySlots` は HTML 文字列の map です。`appendContentBodySlot` は断片を追加し、`ContentSlot` は選んだ断片を `dangerouslySetInnerHTML` で挿入します。`apps/web/app/components/article/article.tsx` は header、metadata、aside、before-content、after-content、footer を決まった位置に描画します。つまり Plugin が manifest を作る段階で Site の DOM 上の位置を選んでいます。

`[data-slot]` を CSS selector として使う stylesheet は見つかりませんでした。主な用途は DOM hook です。ただし結合は残っています。`ArticleLayout` と integration CSS が固定 grid を提供し、app も同じ `data-article-layout` を使っています。

## 4. 移行後のコンポーネントモデル

UI を持つ Plugin は、次の 3 つを分離して公開します。

1. 狭い不変 model を返す server-safe な query/helper
2. model または狭い props を受け取る型付き JSX component
3. component 内部の CSS と、必要な client entry

Factory は pipeline、asset、endpoint、diagnostic、head tag、dependency の登録を担当します。JSX を文字列にして entry に書き込み、UI を配置してはいけません。component はデータが空なら `null` を返します。Site は 0 回、1 回、複数回描画できます。重複を防ぐかは Site の責務ですが、重複した DOM ID が正しさを損なう場合だけ component 側でも扱います。

```tsx
const backlinks = getBacklinks(view, entry.slug)
return <Backlinks items={backlinks} />
```

server helper と component は browser 専用コードを import しません。browser code は client entry として登録し、その component の DOM/data だけを扱います。Factory を無効にすれば capability はなくなり、component を置かなければ配置だけがなくなります。

## 5. UI 境界となる PublicContentView

公開 UI は `ContentManifest` ではなく `PublicContentView` を受け取ります。この名前は「型の見え方」ではなく、公開して安全なデータであることを表します。raw map を型変換するのではなく、filter 済みの map と graph を新しく構築します。

| 契約 | 含むもの | 表示できるもの |
| --- | --- | --- |
| `routableEntries` | public と unlisted | 自身の route |
| `discoverableEntries` | public | list、navigation、tag、graph の近傍 |
| `findRoutableBySlug` / alias | routable target | 明示リンク。unlisted を含む |
| `findDiscoverableBySlug` | public target | 発見 UI のみ |
| tag、graph、backlink、related、docs navigation | discoverable record のみ | public の関係だけ |

draft/private entry と、その title、slug、permalink、alias、tag、relation は含めません。unlisted entry は public entry から明示的にリンクされているときだけ解決できますが、index、related、backlink、tag、docs navigation、graph の発見結果には入りません。現在の routable entry は自身の route で描画できます。Properties は routable target だけをリンクにし、それ以外はプレーンテキストにします。

翻訳も同じです。route は安全な translation group の候補を出せますが、発見 list に出すのは discoverable translation だけです。facade は raw index を渡さず、`getBacklinks`、`getRelated`、`getTranslations` のような専用 API を公開します。

## 6. HTML と本文の境界

Markdown は pipeline が作る `entry.html` のまま `ArticleBody` で描画します。`PageBody` は legacy/generated の `PluginPageType` HTML の境界として残します。必要なら `HtmlFragment` を server 専用の低水準 primitive とし、`{ html, source: "markdown" | "plugin-page" }` だけを受け取ります。これは Plugin UI 用の汎用 escape hatch ではありません。新しい記事外 UI は JSX にします。browser input や任意の Plugin 文字列を、所有者が信頼済み pipeline として扱わずに raw injection してはいけません。

## 7. 責務と CSS 契約

| 所有者 | 所有するもの | 所有してはいけないもの |
| --- | --- | --- |
| Core | content contract と filter 済み public view | HonoX や Site layout |
| HonoX integration | semantic primitive と HTML boundary | article grid や配置方針 |
| Plugin | model、component 内部、asset、runtime | page shell、rail、sticky 位置 |
| Theme | token、typography、色、element style | 構造的な layout の選択 |
| Site | TSX composition、grid、responsive rule、sticky rail | 再利用可能な Plugin capability |

`.rb-article-layout` と `.rb-page-body` の integration layout CSS を削除し、`articleLayout` / `data-article-layout` を layout controller として廃止します。typography 用の `.rb-article-content`、header、metadata、footer などの stable hook は残します。TOC は grid column、negative margin、sticky rule を持つため現状ではこの方針に反します。内部の見た目だけを残します。Docs plugin の CSS はおおむね内部向けです。12 個の Slot Plugin に、ほかの global placement CSS はありません。Slot Plugin ではない `sidenotes` に sticky behaviour があるため、同じ方針で別途見直します。

## 8. Site による composition の例

layout は preset や Plugin ではなく Site が決めます。

```tsx
// Minimal: 1 カラム
<Article><ArticleHeader entry={entry} /><ArticleBody html={entry.html} /></Article>

// Starter: 補助 UI を明示する
<Article class="article"><ArticleHeader entry={entry} /><Properties entry={entry} view={view} />
  <ArticleBody html={entry.html} /><ShareControls entry={entry} />
  <Backlinks items={getBacklinks(view, entry.slug)} />
</Article>

// Showcase: Site が所有する rail
<main class="article-shell"><article><ArticleBody html={entry.html} /><RelatedPosts items={related} /></article>
  <aside class="article-rail"><TableOfContents items={toc} /><DocsSidebar navigation={docs} /></aside>
</main>
```

```css
.article-shell { display: grid; grid-template-columns: minmax(0, 46rem) 18rem; gap: 3rem; }
.article-rail { position: sticky; top: 1.5rem; align-self: start; }
@media (max-width: 52rem) { .article-shell { display: block; } .article-rail { position: static; } }
```

Minimal は rail を持ちません。Starter は flow layout を選べます。Showcase は grid、breakpoint、sticky behaviour を所有します。Plugin style は自分の control を装飾できますが、これらの wrapper を前提にしてはいけません。

## 9. HonoX primitive と export

`Article`、`ArticleHeader`、`ArticleContent`、`ArticleBody`、`PageBody`、`ArticleFooter`、`Sidebar`、`ThemeRoot` は、Slot API と配置 attribute を取り除いた semantic primitive として残します。component は Plugin package に置き、model type と helper とともに public entry point から export します。Site TSX は application の `app/` に置きます。HonoX は rendering primitive だけを所有し、Plugin component を集めたり順序を決めたりしません。

## 10. Plugin 移行表

| Plugin | 移行後 API と Site の使用 | 維持 / 削除 |
| --- | --- | --- |
| backlinks | `getBacklinks(view, slug)`、`<Backlinks>` | graph/assets を維持、`render` と footer hook を削除 |
| breadcrumbs | `getBreadcrumbs(view, entry)`、`<Breadcrumbs>` | JSON-LD head hook を維持、header 挿入を削除 |
| changelog | async `getChangelog(view, entry)`、`<Changelog>` | Git dependency/diagnostic を維持、after-content hook を削除 |
| diff | `getPostDiff(entry)`、`<PostDiff>` | history API/runtime を維持、旧 `ui.enabled` を capability と分離 |
| docs | `getDocsNavigation`、`getDocsPrevNext`、`<DocsSidebar>`、`<DocsPrevNext>` | navigation data/client 内部を維持、aside/footer 挿入を削除 |
| l10n | `getLocalization(view, entry)`、`<LanguageSwitcher>` | route transform と alternate head tag を維持、`ui.slot` と render callback を削除 |
| local-graph | `getLocalGraph(view, slug)`、`<LocalGraph>` | asset/runtime を維持、`render` hook を削除 |
| properties | `getProperties(view, entry)`、`<Properties>` | safe link を使用、metadata 挿入を削除 |
| related-posts | `getRelatedPosts(view, entry)`、`<RelatedPosts>` | ranking option を維持、`render` hook を削除 |
| series | `getSeriesNavigation(view, entry)`、`<SeriesNavigation>` | list/index Page Type を維持、footer 挿入を削除 |
| share | `getShareLinks({ entry, site })`、`<ShareControls>` | service/copy runtime を維持、`placement` を削除 |
| webmention | `getWebmentionsForEntry(entry)`、`<WebmentionSection>` | endpoint、storage、verification を維持、`render` hook を削除 |

helper は Slot HTML ではなく空の model または collection を返します。component の空状態は package ごとに決めます。通常は `null`、Webmention は意図した空表示を持てます。設定には label、ranking、provider、navigation source のような機能の意味を残し、配置の意味は残しません。

## 11. Plugin ごとの可視性規則

backlinks、related posts、local graph、series、docs navigation、tag 起点の breadcrumbs は discoverable data を使います。Properties は明示された routable unlisted target にはリンクできますが、routable でない target にはリンクしません。l10n の候補は route の安全な group contract で絞ります。changelog と diff は現在の routable entry だけを対象にします。webmention と share はその entry を扱うため、manifest 全体の discovery は不要です。

## 12. Factory、設定、dependency

UI 以外の処理には Factory の登録が必要です。`breadcrumbs.jsonLd`、l10n の alternate link、diff history endpoint、webmention verification、asset、client entry は引き続き Factory の責務です。自動配置を意味する `render`、`placement`、任意の `slot`、HTML callback option は削除します。隠れた default として意味を変えてはいけません。

Diff の履歴取得・生成は明示的な capability opt-in を必要とします。Diff component を導入・配置しただけでは履歴 I/O を有効にしません。既存の履歴機能は Phase 2 の API 移行まで変更しません。

Webmention の外部 build dependency は、明示的な static snapshot capability opt-in を必要とします。component の描画は既存 snapshot を読むだけで外部 I/O を行いません。snapshot の更新と UI の配置は分離し、既存の Webmention 機能は Phase 2 まで変更しません。

Docs は navigation data の生成に navigation-source contract を使います。`sidebar.auto` と `prevNext` は配置を示しません。目標モデルでは Sidebar と Prev/Next は独立 component とし、既存の Docs 表示は Phase 2 まで維持します。

## 12.1 基盤 API

`createPublicContentView(manifest)` は、manifest の状態ごとに新しい freeze 済み public-data facade を作ります。`routableEntries`、`discoverableEntries`、`findRoutableBySlug`、`findDiscoverableBySlug`、`findRoutableByAlias`、`getDiscoverableEntriesByTag`、discoverable な graph 関係 API を公開します。routable record をコピーし、non-routable target への link を除外し、filter 済み record から alias、tag、graph の結果を再構築します。raw manifest map や graph は公開しません。manifest をまたぐ memoization は意図的に行わないため、公開状態の変更で古い View が再利用されません。

`HtmlFragment` は server 専用の HonoX primitive です。

```tsx
<HtmlFragment html={html} source="markdown" />
```

wrapper を出力せず、`source` は provenance を表すだけで、runtime の sanitize や security guarantee ではありません。`ArticleBody` と `PageBody` は Markdown と Plugin Page HTML の semantic boundary として残します。HTML は sanitize しません。Markdown の raw HTML、rehype/remark の出力、Plugin Page HTML、外部 data から作る HTML は、この boundary の前に各所有 pipeline が信頼・sanitize する必要があります。新しい Plugin UI には JSX を使い、この primitive を使いません。

Plugin package は factory に加えて `PluginDataHelper<Input, Model>` と `PluginComponent<Props>` を export できます。helper は `PublicContentView` のような狭い input を受け、component は readonly の型付き props を受けて Slot HTML を返しません。必要に応じて package export は `./components`、`./style.css`、`./client` を追加できます。既存の asset と client-entry の登録は引き続き factory の責務であり、component を import しただけでは CSS/client runtime の登録も Plugin capability の有効化も行いません。CSS の tree shaking は既存の package `sideEffects` metadata に従います。

## 13. Cache と Incremental SSG への影響

現在の manifest-hook cache は raw entry を serialize し、public/discoverable collection、generated data、asset、client entry、diagnostic を fingerprint しています。Slot を削除すると generated `bodySlots` と 12 個の rendering hook が消えます。古い snapshot を再利用しないよう、cache schema/version と pipeline fingerprint を変更します。

`computeAppFingerprint` は `app/` と config を hash します。したがって Site の TSX/CSS で配置を変えると no-change incremental SSG path は invalidate されます。配置専用の dependency は不要です。Plugin の enable/config 変更も対象です。global content dependency は、別途改善するまで広く invalidate されます。Phase 1 では cold build、persistent-cache build、content 変更 build、app の配置だけを変えた build を確認します。

## 14. 移行順序とテスト

1. `PublicContentView` を追加し、filter 済み map から private field や relation を読めないことをテストします。
2. component/query export を追加します。現在の Slot 実装は、同じ breaking release で Site consumer を全て移すまでだけ残します。
3. Site と preset を明示的な TSX/CSS composition に移します。
4. 12 Plugin を変換し、UI 以外の hook と Page Type を維持します。
5. Slot contract、primitive、CSS、test、設定項目を 1 回の breaking change で削除します。互換 adapter は出しません。

helper の可視性、空表示、client entry 登録、UI 配置以外の Factory 処理、public/unlisted/draft の組み合わせ、Site での重複利用、desktop/mobile layout、cache invalidation をテストします。変換した Plugin ごとに component unit test と Site integration fixture を追加します。

## 15. Phase 2 の開始条件

基盤 API test、HonoX primitive test、cache と incremental SSG の回帰確認、typecheck、Biome、documentation check が成功し、既存 Slot の描画が維持されてから Phase 2 を開始できます。その後も上記 capability の判断を変えず、Plugin API を 1 件ずつ移行します。

## 16. Cache と SSG の検証

基盤 API は cache schema、pipeline fingerprint、output dependency、Plugin fingerprint、Slot HTML を変更しません。`PublicContentView` は現在の manifest から導出し、persistent cache を持ちません。`HtmlFragment` の変更範囲は SSR HTML の描画だけです。既存の `computeAppFingerprint` は引き続き `app/` の TSX/CSS 変更で SSG output を invalidate します。Phase 1 では既存の小規模 fixture を使って cold、no-change、content、publication、layout-only、Plugin-data を確認し、10,000 件 benchmark は実行しません。

**Phase 1 の結果:** Core と HonoX integration suite が成功しました。persistent-content / manifest-hook cache、publication state、output dependency、cold / no-change / content edit / app change、Plugin configuration を確認しています。この追加 API に cache schema または fingerprint の変更は不要です。
