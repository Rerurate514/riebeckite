---
date: 2026-10-08
title: UI・アセット・実行時連携
sidebar:
  label: UI・アセット・実行時連携
  order: 30
---
# UI・アセット・実行時連携

## UIコンポーネント

プラグインは、ファクトリから `PluginComponent<Props>` と `PluginDataHelper<Input, Model>` をエクスポートできます。データヘルパーは `PublicContentView` のような狭い入力を受け取り、型付きのモデルを返します。コンポーネントは読み取り専用の型付き props を受け取り、描画結果を返します。サイトは自身の TSX でこれらのコンポーネントを組み合わせ、表示するかどうか、位置、頻度を決めます。

典型的なエクスポートの形は次のとおりです。

```ts
// index.ts
export function example() {
  return definePlugin({
    name: "example",
    // ... factory hooks, assets, clientEntries, etc.
  });
}

export { MyComponent, getMyData };
```

より整理された構成にしたい場合は、プラグインの `./components/` の下に置けます。

```text
packages/plugins/example/
├─ index.ts
├─ components/
│  ├─ my-component.tsx   // <MyComponent /> と getMyData を export
│  └─ types.ts
├─ style.css
└─ client.ts
```

サイト側では、これをインポートして描画します。

```tsx
import { getMyData } from "@riebeckite/plugin-example";
import { MyComponent } from "@riebeckite/plugin-example/components";

const model = getMyData({ view, frontmatter: entry.frontmatter });
<MyComponent model={model} />
```

コンポーネントは、内部で使う CSS やクライアントコードを選択してエクスポートすることもできます。登録は既存の連携処理を通じて行われます。アセットとクライアントコードの登録は、引き続きプラグインのファクトリが担当します。コンポーネントをインポートしただけでは、CSS やクライアントランタイムは登録されず、プラグインの機能も有効になりません。CSS のツリーシェイキングは、既存のパッケージの `sideEffects` メタデータに従います。

### SPAナビゲーション時の配置

コンポーネントはサーバーのリクエストに対して描画するもので、どこに配置するかや、ブラウザ上でいつ置き換えるかは決めません。ページの内容に属するコンポーネントは、Site が `main#main-content` に置きます。シェルの出力が現在の URL、言語、ページデータに依存する場合は、相互に遷移するすべてのルートで、安定して一意な `data-spa-region` で囲みます。

```tsx
<aside data-spa-region="docs-navigation">
  <DocsSidebar />
</aside>
```

クライアントの動作はコンポーネントの所有ではなく DOM の寿命に従います。`main` 内のコンテンツ用の[[glossary/client-entry|クライアントエントリ]]は既定の `page` scope を使います。置き換わるシェル region 用のクライアントエントリは `app` scope で実行し、`spa:navigation` の後に初期化し直すか、イベント委譲を使います。Plugin はコンポーネントがどちらに置かれるかを前提にしてはいけません。

[[framework/honox-integration|HonoX]]の描画プリミティブとして、`Article`、`ArticleHeader`、`ArticleContent`、`ArticleBody`、`ArticleFooter`、`Sidebar`、`ThemeRoot` があります。これらは記事の構造とレイアウトのための意味的な部品です。プラグインのコンポーネントはプラグインのパッケージに置き、モデルの型やヘルパーとともに公開エントリーポイントからエクスポートします。サイトの TSX はアプリケーションの `app/` に置きます。HonoX は描画のプリミティブだけを所有し、プラグインのコンポーネントを集めたり、順序を決めたりしません。

```tsx
// サイト route にある最小 UI composition
import { getBacklinks } from "@riebeckite/plugin-backlinks";
import { MyComponent } from "@riebeckite/plugin-example";

const view = createPublicContentView(manifest);
const entry = view.findRoutableBySlug(slug);
const backlinks = await getBacklinks({ view, slug });
<article>
  <MyComponent backlinks={backlinks} />
</article>
```

## Markdown コンポーネント

通常の Markdown から自己完結した UI を描画するプラグインには `components` を使います。コンポーネントは Markdown AST の処理中に描画され、対話型コンポーネントのブラウザモジュールは、そのコンポーネントを含むページでだけ読み込まれます。

```tsx
import { definePluginComponent } from "@riebeckite/core";
import { renderToString } from "hono/jsx/dom/server";

components: [
  definePluginComponent({
    name: "Counter",
    parseProps: (props) => ({ initial: Number(props.initial ?? 0) }),
    render: (props) => renderToString(<Counter {...props} />),
    client: { moduleSpecifier: "@example/plugin/counter" },
  }),
];
```

MDX を有効にしなくても、Markdown では次のように書けます。

````md
```riebeckite-component Counter
initial: 3
```
````

props は YAML のマッピングでなければならず、JSON として安全にシリアライズできる公開データだけが使われます。コンポーネント名はプラグイン全体で一意にしてください。重複はプラグイン解決時に失敗します。静的コンポーネントでは `client` を省略します。対話型コンポーネントは既定 export の Hono JSX コンポーネント（または `exportName` で指定した export）を公開し、生成されたクライアントエントリが hydration します。イベント委譲、任意の DOM を管理するウィジェット、ページ全体の動作には引き続き `clientEntries` が適しています。

フェンスは Markdown を HTML に変換する前の通常のコードブロックとして処理されるため、素の Markdown で動作し、MDX は不要です。MDX はページ全体で JSX が必要な場合の別のコンテンツ形式として残ります。このコンポーネントは HonoX の Island ではありません。HonoX は `app/islands` だけを走査し、Riebeckite の生成クライアントがコンポーネントのマーカーを見つけて、宣言されたモジュールを Vite 経由で読み込みます。HonoX がクライアントバンドルを出力できるようレンダラーで `__importing_islands = true` を維持し、`clientEntries` のモジュールと同じようにクライアントのビルド成果物をパッケージの manifest から公開してください。すべての Markdown を MDX にせず、フェンスの構文を小さく保つための選択です。

`parseProps` はコンテンツ由来の値を検証する境界です。コンポーネントのサーバー出力は通常の Markdown サニタイザーを通り、props は属性に渡す前にエスケープと検証を行います。コンポーネントは処理済み Markdown を変えるため、永続キャッシュを有効にする場合はプラグインの `processedContentCache` 契約に含めてください。含めない場合、古い HTML を返さず、そのプラグインのキャッシュをバイパスします。コンポーネントの描画を変えたときは契約の `version` を更新してください。

`resolveProps` は `parseProps` の後に `{ sourceSlug, resolveAssetUrl }` を受け取って実行されます。コンテンツからの相対パスに依存する props に使ってください。解決後の props もハイドレーション境界を越えるため、JSON 安全でなければなりません。`resolveAssetUrl` は未対応のパスや外部 URL では `null` を返すので、描画前に結果を検証してください。

解決の失敗はビルドを止める例外ではなく、コンテンツ側の誤りとして扱います。`error` 状態を返し、画面に読めるメッセージを出してください。コンポーネントの解決には診断を直接渡す経路がないため、そのエラー出力に付けたマーカーから manifest フックで診断を作ります（画像比較プラグインの `data-image-compare-error` が例です）。文字列の一覧を別に持たせて済ませないでください。解決後の出力は処理済み Markdown の一部なので、元のコンテンツ、slug、参照パスが変わればコンテンツのフィンガープリントでキャッシュが無効になります。

### JSX と SSR の使い分け

UI が読みやすい最小の方法を選びます。状態がマークアップを決める場合（デッキ、スライダー、ダイアログ）は Hono JSX で描画し、JSON 安全な props からハイドレートします。マークアップが静的で、スクリプトがイベントや計測だけを足す場合は、コードタブや目次のように SSR HTML と小さな Behavior の初期化を維持します。統一のためだけにサニタイズ済みの HTML を JSX へ置き換えないでください。どちらも同じサニタイザーを通ります。

対話型コンポーネントの JSX ランタイムは、そのコンポーネントを含むページにだけ読み込まれます。含まないページでは読み込まれません。Behavior のクライアントエントリはランタイムより小さいため、単純なウィジェットに hydration は必要ありません。

コンポーネントの契約はシリアライズした props で終わります。children、slot、任意の HAST ノードは公開 API ではありません。内容は Markdown に置き、文字列か識別子を渡してください。これによりサニタイザーの境界と、キャッシュが使う HTML のフィンガープリントを保てます。

### 外部レンダラー

外部のレンダラーは独自ループを書かず、`@riebeckite/diagram/client` のヘルパーで包みます。`renderPendingDiagrams` は未処理の figure を順に処理し、処理中は `aria-busy` を付け、`data-diagram-status` を `rendered` または `error` にし、失敗時は SSR のフォールバックを開きます。作成したチャートを破棄するクリーンアップも返します。ライブラリは遅延 import して固有のチャンクを保ち、各 `await` の後に `signal.aborted` と `isConnected` を確認してください。ライブラリが描く canvas、SVG、DOM はそのまま残します。`mermaid`、`graphviz`、`chartjs` はこの形に従っています。ライフサイクルが本質的に異なるプラグインは、独自の初期化を残してかまいません。

## オーバーレイホスト

テーマは `@riebeckite/ui/overlay` の `<OverlayHost name="…" />` で、クライアント用オーバーレイの SSR ホストを用意できます。クライアントの初期化処理は `findOverlayHost(name)` でホストを探し、テーマが用意していない場合は自前でホストを作ってかまいません。オーバーレイ名ごとにホストを1つにし、クライアントエントリの終了時はコンポーネントだけをアンマウントして、アプリが持つホストは残してください。

MDX ページは別のコンポーネント実装ではなく、同じレジストリを使います。登録したコンポーネントは MDX レンダラーへ JSX コンポーネントとして渡されます。

```mdx
<Counter initial={3} />
```

`mdx({ components })` で同じ名前のコンポーネントを渡した場合、そのページではプラグインコンポーネントより優先されます。props はハイドレーション境界を越えるため JSON 安全でなければなりません。内容は JSX の children ではなく、明示的な文字列 prop で渡してください。`parseProps` による検証は同じように働き、ハイドレートされるのは対話型コンポーネントだけです。MDX はコンポーネントを直接描画するため、`render` の出力は信頼済みのプラグインコードとして扱われ、Markdown サニタイザーを通りません。信頼できない内容は props に置き、コンポーネント側でエスケープしてください。

## アセット

プラグイン固有の CSS はプラグインのパッケージ内に置き、`assets` で公開します。

```ts
assets: [
  {
    pluginName: "example",
    kind: "style",
    moduleSpecifier:
      "@riebeckite/plugin-example/style.css",
  },
]
```

プラグインの CSS を `website` へコピーしたり、ブラウザから `/node_modules` を直接参照させたりしないでください。

`createStyleAsset()` と `createClientEntry()` には、プラグイン名と、パッケージが `exports` で公開するモジュール指定子を明示します。そのため、`@riebeckite/plugin-<name>`、サイト内のプラグイン、任意の名前の第三者パッケージで同じ API を利用できます。

```mermaid
flowchart LR
    Plugin["プラグインのパッケージ"]
    CSS["style.css"]
    Asset["アセット"]
    Integration["統合処理"]
    Browser["ブラウザ"]

    Plugin --> CSS
    CSS --> Asset
    Asset --> Integration
    Integration --> Browser
```

## CSSフック

プラグイン固有の CSS はプラグインのパッケージ内に置き、最も外側の要素に安定した CSS フックを付けます。

フック名には `rr-<feature>` の形式を使います。たとえば `rr-search`、`rr-callout`、`rr-query`、`rr-code` です。

内部の要素には BEM 形式を使えます。

```text
rr-search
rr-search__input
rr-search__result
rr-search--loading
```

新しいプラグインの出力を `rb-*` の名前空間に置かないでください。一部の組み込みプラグインは互換性のため、文書化された `rb-*` ルートを引き続き公開しています。テーマは各プラグインが文書化しているルートを対象にしてください。

| 名前空間 | 用途 |
| --- | --- |
| `rb-*` | フレームワークの構造フック。一部の組み込みプラグインも文書化されたルートとして使用 |
| `--rb-*` | フレームワークの意味的な[[glossary/design-token|デザイントークン]] |
| `rr-*` | プラグインと機能のフック |
| `--rr-*` | プラグイン固有のトークン |

出力には `rr-*` のフックだけを使い、プラグインの CSS と[[glossary/theme|テーマ]]も `rr-*` のフックを対象にします。テーマに公開する必要があるフックだけを、安定した取り決めとして文書化してください。

プラグインの既定の CSS はテーマの CSS より先に読み込まれるため、テーマはプラグインのパッケージを変更せずに見た目を上書きできます。

ダークモードへの対応では、`--rb-*` の意味的なトークンを参照するのが基本です。これらのトークンは、ライト、明示的なダーク、システム設定によるダークのいずれでも正しく解決されます。状態そのもので分岐する必要があるのは、ビルド済みの画像を反転する場合などに限られます。その場合は、HTML のルート要素でも埋め込みテーマの `.rb-theme-root` でも効くように、テーマのルートへスコープしてください。

セレクターは `:is(:root, .rb-theme-root)[data-rb-mode="dark"] <hook>` です。システム設定によるダークモードには `@media (prefers-color-scheme: dark) { :is(:root, .rb-theme-root):not([data-rb-mode]) <hook> { ... } }` を使います。`html[data-rb-mode="dark"]` や `:root:not([data-rb-mode])` だけに依存すると、埋め込みテーマのルートを取りこぼします。フレームワークは `.dark` クラスを付与しないため、`.dark` を前提にしないでください。

詳しくは [テーマ API](../theme-api.ja.md#安定した css フック) を参照してください。

## クライアントエントリ

ブラウザ上で JavaScript を実行する必要がある場合だけ、`clientEntries` を使います。

```ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier:
      "@riebeckite/plugin-example/client",
    exportName: "initExample",
    publicConfig: {
      selector: ".example",
    },
  },
]
```

```mermaid
flowchart LR
    Plugin["プラグイン"]
    Entry["クライアントエントリ"]
    Build["統合処理"]
    Browser["ブラウザでの初期化"]

    Plugin --> Entry
    Entry --> Build
    Build --> Browser
```

サーバー側の描画やビルドだけで完結するプラグインに、クライアントの JavaScript を追加しないでください。

`publicConfig` はブラウザへ渡される公開情報です。そのため、次の情報を含めてはいけません。

- トークン
- 認証情報
- 非公開のサービス URL
- 秘密情報

プラグインの `options` が自動的にブラウザへ渡されることもありません。

クライアント側が所有するUIはHono JSXで書き、`hono/jsx/dom/client` の `createRoot()` でホスト要素へ描画してください。フォーカス、サイズ測定、ポインターキャプチャ、メディア再生など、ブラウザでしか行えない処理は初期化関数に残します。特定のマーカーを含むページだけで初期化すればよい場合は、`createClientEntry()` の第7引数へpresence selectorを渡し、他のページでチャンクを読み込まないようにしてください。

セレクターはページの描画後に DOM に対して確認されるため、マーカーは SSR の HTML に存在するか、SPA のページ確定前に追加されている必要があります。プラグインが後からクライアントで作る内容を対象にしないでください。常に動かす機能（`analytics`、`color-mode`、`text-fragment`、`ux`）はセレクターを省略し、無条件に読み込みます。セレクターが制御するのは読み込みの有無だけです。初期化関数の中でも対象要素の存在を確認してください。

クライアントの動作はライフサイクルのスコープに従います。`page` のエントリはページ確定後にマウントされ、次の遷移でアンマウントされます。`app` のエントリはドキュメントの間ずっと存在するため、イベント委譲を使うか、自前で再初期化してください。リスナー、オブザーバー、タイマー、ライブラリのインスタンスは初期化関数からクリーンアップを返し、読み込みが中断された場合に作ったものも解放してください。

## HTTPエンドポイント

再利用できる HTTP エンドポイントを提供する場合は、`endpoints` を使います。

```mermaid
flowchart LR
    Plugin["プラグイン"]
    Contract["エンドポイントの取り決め"]
    Integration["統合処理"]
    Router["ホストのルーター"]

    Plugin --> Contract
    Contract --> Integration
    Integration --> Router
```

HonoX など特定のルーター実装をプラグイン本体へ直接埋め込まず、エンドポイントの取り決めは統合処理がホストのルーターへ接続します。

## SEO

メタデータやフィードなどの SEO 処理に参加する場合は、`seo` 拡張ポイントを使います。プラグイン固有の SEO 処理を、アプリケーションのルート側へ実装し直さないでください。

## 診断

プラグイン固有の問題を報告する場合は、`addDiagnostics` を使います。

```ts
addDiagnostics(context) {
  return [
    {
      // Diagnostic contract
    },
  ];
}
```

診断結果は、可能な限り構造化されたデータとして返してください。CLI 向けのメッセージを `console.log(...)` で直接出力するのではなく、診断の仕組みか Logger を使ってください。

## プラグインのキャッシュ

`context.cache` は、プラグインごとに分離されたビルド時のキャッシュです。保存する値は、次の条件を満たす必要があります。

- 再生成できる
- JSON として保存できる
- プラグインの名前空間内で完結する

`cacheVersion` を使うと、キャッシュ形式の互換性を管理できます。壊れたキャッシュを安全にキャッシュの未命中として扱えるように設計してください。書き込みは不可分に行います。

```mermaid
flowchart TD
    Plugin["プラグイン"]
    Cache["プラグインのキャッシュ"]
    Valid{"利用できるか"}
    Plugin --> Cache
    Cache --> Valid
    Valid -->|"はい"| Reuse["再利用"]
    Valid -->|"いいえ"| Generate["再生成"]
```

このキャッシュは、Cloudflare Workers などの実行時データベースではありません。

## ログとトレース

プラグインは、フレームワークの可観測性の仕組みを利用できます。

```ts
context.logger.info("...");
await context.tracer.span(
  "plugin.example.work",
  {
    plugin: "example",
  },
  async () => {
    // work
  },
);
```

Logger は「何が起きたか」を、Tracer は「どこに時間がかかったか」を記録します。Profiler はこの構造化されたトレースを利用するため、プラグインが独自のストップウォッチや[[glossary/profiler|プロファイラ]]を作る必要はありません。
