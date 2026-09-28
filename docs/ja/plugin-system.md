# Plugin System

Riebeckite Plugin は、コンテンツの解釈・変換・表示拡張・診断・build-time
処理を追加するための拡張機構です。このページでは個別 Plugin
の説明ではなく、**Plugin を利用・設計・実装するための共通 contract**
を説明します。

## まず最小の extension point を選ぶ

semantic な source transform には remark/rehype または pipeline extension、明確な content phase が必要な場合だけ content hook を使います。CSS は asset、必要な browser code だけを client entry、再利用可能な HTTP behavior は endpoint、特定 target の表示は renderer で公開します。application route や framework 固有 routing を Plugin に隠さず、application/integration の責務として保ってください。

## 最小 Plugin

``` ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({
    name: "example",
  });
}
```

Plugin factory に options を持たせる場合は型を付け、解決済み options を
`options` に保持できます。

``` ts
type ExampleOptions = {
  enabled?: boolean;
};

export function examplePlugin(options: ExampleOptions = {}) {
  return definePlugin({
    name: "example",
    options,
  });
}
```

## RiebeckitePlugin の構成

現在の Core contract は大きく次の領域を持ちます。

  -----------------------------------------------------------------------
  領域                                API
  ----------------------------------- -----------------------------------
  Identity                            `name`, `enabled`, `order`,
                                      `options`

  Dependency                          `provides`, `requires`, `optional`

  Validation                          `validateOptions`

  Cache                               `cacheVersion`, `context.cache`

  Lifecycle                           `setup`, `buildStart`, `buildEnd`,
                                      `dispose`

  Content hooks                       `onConfigResolved`,
                                      `onContentLoaded`, `onPostParsed`,
                                      `onPostProcessed`,
                                      `onManifestCreated`

  Legacy/compat build hooks           `onBuildStart`, `onBuildEnd`

  Pipeline                            `remarkPlugins`, `rehypePlugins`,
                                      `extendMarkdownPipeline`,
                                      `extendHtmlPipeline`

  Graph                               `extendContentGraph`

  Diagnostics                         `addDiagnostics`

  Rendering                           `renderers`

  Browser integration                 `assets`, `clientEntries`

  HTTP integration                    `endpoints`

  SEO                                 `seo`
  -----------------------------------------------------------------------

すべてを実装する必要はありません。Plugin が必要とする最小の extension
point だけを使います。

## 有効化と順序

`false | null | undefined` は Plugin input
から除外され、`enabled: false` も実行対象になりません。`order` は
dependency resolution 前の基本順序を決めます。

``` ts
plugins: [
  condition && myPlugin(),
]
```

依存関係がある場合は単純な `order` より capability contract
を優先してください。

## Capability / Dependency

``` ts
definePlugin({
  name: "consumer",
  provides: ["example.output"],
  requires: ["content.graph"],
  optional: ["example.optional"],
});
```

-   `provides`: この Plugin が提供する capability
-   `requires`: 必須 capability
-   `optional`: 存在すれば利用する capability

Resolver は provider を consumer より前に配置します。missing
requirement、duplicate provider、cycle は設定エラーです。無関係な Plugin
の入力順は可能な限り維持されます。

## Options Validation

TypeScript の型は設定ファイル実行後の runtime value
を完全には保証しません。必要な Plugin は `validateOptions` を持てます。

Validator は副作用を持たせず、filesystem scan、build、cache write
を行わないでください。問題は structured issue として返し、config
validation がまとめて表示できるようにします。

## Plugin Context

基本 context:

``` ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  logger: Logger;
  tracer: Tracer;
};
```

Hook に応じて `slug`, `markdown`, `content`, `manifest`, `entries`
などが追加されます。

Plugin は global singleton を作るより、context から framework service
を受け取ることを優先します。

## Lifecycle

Framework lifecycle 用に `setup`, `buildStart`, `buildEnd`, `dispose`
があり、content pipeline 側には config/content/post/manifest hook
があります。

`dispose` は確保した resource の解放に使います。Hook error は Plugin
名と hook を識別できる形で上位へ伝播し、元の cause
を失わないことが重要です。

Lifecycle の実行順は resolved plugin order に従います。

## Markdown / HTML Pipeline

簡単な remark/rehype Plugin は配列で宣言できます。

``` ts
definePlugin({
  name: "example",
  remarkPlugins: [remarkExample],
  rehypePlugins: [rehypeExample],
});
```

Pipeline 自体を構成したい場合:

``` ts
definePlugin({
  name: "example",
  extendMarkdownPipeline(pipeline, context) {
    pipeline.use(remarkExample);
  },
  extendHtmlPipeline(pipeline) {
    pipeline.use(rehypeExample);
  },
});
```

Markdown/HTML の意味変換は Plugin に置き、application component に AST
処理を持ち込まないのが基本です。

## Content Hooks

代表的な処理段階:

``` text
config resolved
→ content loaded
→ post parsed
→ post processed
→ content graph
→ manifest created
```

各段階で本当に必要な hook
だけを使います。後段の情報を前段で再構築しないでください。

## Content Graph

`extendContentGraph` は Manifest entry 群に対して graph 構築前後の
framework contract に沿った拡張を行うための hook です。

Backlinks や graph 系機能のために Plugin 独自で filesystem
を再走査するのではなく、既存 Content Graph / Manifest contract
を利用してください。

## Renderers

`renderers` は content target を Plugin 固有 HTML へ変換する extension
point です。

Renderer context には `kind`, `path`, `raw`, `label`, `url`, `embed`
と通常の PluginContext が含まれます。処理対象でなければ `null`
を返し、他 renderer に委ねられる設計にします。

## Assets

Plugin 固有 stylesheet は Plugin package 内に置き、`assets` で module
specifier を宣言します。

``` ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

`apps/web` に Plugin 固有 CSS をコピーしたり、ブラウザから
`/node_modules` を直接参照させないでください。

## Client Entries

ブラウザ初期化が必要な場合だけ `clientEntries` を使います。

``` ts
clientEntries: [{
  pluginName: "example",
  moduleSpecifier: "@riebeckite/plugin-example/client",
  exportName: "initExample",
}]
```

SSR/build-time だけで完結する Plugin に client JavaScript
を追加しないことが重要です。

## Endpoints

Plugin が HTTP endpoint を提供する場合は `endpoints` contract
を使います。Route framework 固有実装を Plugin
本体へ直接埋め込まず、Integration が endpoint contract を host router
へ接続します。

## SEO Extension

`seo` は metadata/feed 等の SEO 処理へ Plugin が参加するための extension
point です。Application route 側で Plugin 固有 SEO
ロジックを再実装しないでください。

## Diagnostics

``` ts
addDiagnostics(context) {
  return [{
    // Diagnostic contract に従う
  }];
}
```

診断は可能な限り structured data として返します。CLI 出力を Plugin
が直接 `console.log` するより、Diagnostics / Logger を利用します。

## Plugin Cache

`context.cache` は Plugin ごとに分離された **build-time cache** です。

-   再生成可能な値だけを保存
-   JSON-serializable value
-   Plugin namespace を越えて参照しない
-   `cacheVersion` で互換性を切り替え可能
-   corrupt cache は安全に miss として扱える
-   write は atomic
-   runtime database として使わない

Cloudflare Workers runtime の永続 storage ではありません。

## Logger / Tracer

``` ts
context.logger.info("...");
await context.tracer.span("plugin.example.work", { plugin: "example" }, async () => {
  // work
});
```

Profiler は structured trace を利用します。Plugin が独自
stopwatch/reporting system を持つ必要はありません。

## 推奨 package 構成

``` text
packages/plugins/example/
├─ index.ts
├─ client.ts          # 必要な場合のみ
├─ style.css          # 必要な場合のみ
├─ package.json
└─ src/
   ├─ remark.ts
   ├─ rehype.ts
   ├─ renderer.ts
   └─ types.ts
```

## 設計判断

Plugin に置くもの:

-   Markdown / HTML の解釈
-   reusable content transformation
-   Plugin 固有 renderer
-   reusable browser behavior
-   Plugin 固有 diagnostics
-   Plugin 固有 endpoint/SEO extension

Plugin に置かないもの:

-   framework-wide content model → Core
-   HonoX/Vite 接続 → Integration
-   application 固有 route/layout → App
-   見た目だけの変更 → Theme

## ESM

NodeNext/ESM package では、build 後に Node が解決できる import
を維持してください。開発時の TypeScript loader が extensionless import
等を偶然解決している状態に依存しないでください。

## 関連

-   [Architecture](./architecture.md)
-   [Content System](./content-system.md)
-   [Observability](./observability.md)
-   [Theme System](./theme-system.md)
-   [Framework Reference](./framework-reference.md)
