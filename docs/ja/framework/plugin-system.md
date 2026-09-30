# プラグイン作成の詳細

[はじめてのプラグイン作成](../plugins/writing-a-plugin.md) は、プラグインを動かすまでの流れを短く説明したドキュメントです。このページはその「詳細編」で、プラグインを作るときに参照する全項目（拡張ポイント、capability、lifecycle、pipeline、配布）をまとめています。

はじめての人はまず [plugin-tutorial](../plugins/writing-a-plugin.md) を読み、このページは「もっと詳しく知りたい」ときに使ってください。API surface の詳細は [Plugin API](../reference/plugin-api.md) を参照してください。

## 1. Plugin ができること

Plugin は**機能**を足す仕組みです。Markdown/HTML の解釈、再利用可能なコンテンツ変換、Plugin 固有 renderer、再利用可能なブラウザ動作、Plugin 固有 diagnostics、endpoint/SEO extension を置きます。

**Plugin に置かないもの:**

- framework-wide の content model → Core
- HonoX/Vite の接続 → Integration
- application 固有の route/layout → App
- 見た目だけの変更 → Theme ([Theme System](./theme-system.md))

## 2. 最小 Plugin と options

```ts
import { definePlugin } from "@riebeckite/core";

export function examplePlugin() {
  return definePlugin({
    name: "example",
  });
}
```

factory に options を持たせる場合は型を付け、解決済み options を `options` に保持できます。

```ts
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

`riebeckite.config.ts` では `plugins` 配列に渡します。

```ts
export default defineConfig({
  plugins: [examplePlugin({ enabled: true })],
});
```

`false | null | undefined` は Plugin input から除外されます。`enabled: false` も実行対象になりません。

```ts
plugins: [
  condition && myPlugin(),
]
```

## 3. 拡張ポイント一覧

現在の Core contract は大きく次の領域を持ちます。**すべてを実装する必要はなく、Plugin が必要とする最小の拡張ポイントだけを使います。**

| 領域 | API |
| --- | --- |
| Identity | `name`, `enabled`, `order`, `options` |
| Dependency | `provides`, `requires`, `optional` |
| Validation | `validateOptions` |
| Cache | `cacheVersion`, `context.cache` |
| Lifecycle | `setup`, `buildStart`, `buildEnd`, `dispose` |
| Content hooks | `onConfigResolved`, `onContentLoaded`, `onPostParsed`, `onPostProcessed`, `onManifestCreated` |
| Public Location | `resolveContentLocations` |
| Legacy/compat 引数 | `onBuildStart`, `onBuildEnd` |
| Pipeline | `remarkPlugins`, `rehypePlugins`, `extendMarkdownPipeline`, `extendHtmlPipeline` |
| Graph | `extendContentGraph` |
| Diagnostics | `addDiagnostics` |
| Rendering | `renderers` |
| Browser integration | `assets`, `clientEntries` |
| HTTP integration | `endpoints` |
| SEO | `seo` |

### 3-1. Dependency / Capability

```ts
definePlugin({
  name: "consumer",
  provides: ["example.output"],
  requires: ["content.graph"],
  optional: ["example.optional"],
});
```

- `provides`: この Plugin が提供する capability
- `requires`: 必須 capability
- `optional`: 存在すれば利用する capability

Resolver は provider を consumer より前に配置します。missing requirement、duplicate provider、cycle は設定エラーです。無関係な Plugin の入力順は可能な限り維持されます。`order` は dependency resolution 前の基本順序を決めるだけで、依存関係がある場合は単純な `order` より capability contract を優先してください。

### 3-2. validateOptions

TypeScript の型は設定ファイル実行後の runtime value を完全には保証しません。必要な Plugin は `validateOptions` を持てます。Validator は**副作用を持たせず**、filesystem scan、build、cache write を行わないでください。問題は structured issue として返し、config validation がまとめて表示できるようにします。

### 3-3. Plugin Context

```ts
type PluginContext = {
  config?: ResolvedRiebeckiteConfig;
  contentIndex: Map<string, string>;
  diagnostics: Diagnostic[];
  cache: PluginCache;
  logger: Logger;
  tracer: Tracer;
};
```

Hook に応じて `slug`, `markdown`, `content`, `manifest`, `entries`, location input などが追加されます。Plugin は global singleton を作るより、context から framework service を受け取ることを優先します。

### 3-4. Lifecycle

`setup`, `buildStart`, `buildEnd`, `dispose` と、content pipeline 側の hook があります。`dispose` は確保した resource の解放に使います。Hook error は Plugin 名と hook を識別できる形で上位へ伝播し、元の cause を失わないことが重要です。実行順は resolved plugin order に従います。

### 3-5. content pipeline の段階

```text
config resolved
→ content loaded
→ public location resolved
→ post parsed
→ post processed
→ content graph
→ manifest created
```

各段階で本当に必要な hook だけを使います。後段の情報を前段で再構築しないでください。

### 3-6. Markdown / HTML Pipeline

簡単な remark/rehype Plugin は配列で宣言できます。

```ts
definePlugin({
  name: "example",
  remarkPlugins: [remarkExample],
  rehypePlugins: [rehypeExample],
});
```

pipeline 自体を構成したい場合:

```ts
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

Markdown/HTML の意味変換は Plugin に置き、application component に AST 処理を持ち込まないのが基本です。

### 3-7. Content Graph と Public Location

`extendContentGraph` は graph 構築前後に framework contract に沿った拡張を行うための hook です。Backlinks や graph 系の機能のために Plugin 独自で filesystem を再走査せず、既存 Content Graph / Manifest contract を利用してください。

`resolveContentLocations` は content entry の public location を置き換えるための hook です。Core が先に default resolver（`resolveDefaultContentLocation`: `index` → `/`、それ以外 → `/{slug}`）を適用し、resolved plugin order に従って各 Plugin の hook を実行し、結果を `ContentPublicLocation` として manifest / graph / pipeline に保持します。URL strategy は Plugin の責務です。location 未解決は slug fallback ではなく**明示的な error** です。

### 3-8. Renderers

`renderers` は content target を Plugin 固有 HTML へ変換する拡張ポイントです。context には `kind`, `path`, `raw`, `label`, `url`, `embed` と通常の PluginContext が含まれます。処理対象でなければ `null` を返し、他 renderer に委ねられる設計にします。

### 3-9. Assets

Plugin 固有 stylesheet は Plugin package 内に置き、`assets` で module specifier を宣言します。

```ts
assets: [{
  pluginName: "example",
  kind: "style",
  moduleSpecifier: "@riebeckite/plugin-example/style.css",
}]
```

`apps/web` に Plugin 固有 CSS をコピーしたり、ブラウザから `/node_modules` を直接参照させたりしないでください。

**Site 内 Plugin**: Plugin は publish されている必要はありません。Site 内で `definePlugin` を使って定義し、`plugins` へ渡します。解決順序、依存解決、pipeline hook、diagnostics は package 版と同じ contract です。

```ts
// site/extensions/local-plugin.ts
return definePlugin({
  name: "site-local",
  assets: [{
    pluginName: "site-local",
    kind: "style",
    moduleSpecifier: "/extensions/plugin.css",
  }],
});
```

未 publish の Plugin では `createStyleAsset()`（`@riebeckite/plugin-<name>/style.css` を生成）を利用できません。host bundler が解決できる module specifier を `assets` へ明示してください。

### 3-10. CSS hooks

Plugin 固有 CSS は Plugin package 内に置き、`assets` 経由でブラウザへ届けます。独立した再利用可能な feature を描画するときは、最外要素に stable な root hook を付けます。

- Plugin / feature hook は `rr-<feature>` と命名します（`rr-search`、`rr-callout`、`rr-query`、`rr-code` など）。root の下は `rr-<feature>`、`rr-<feature>__element`、`rr-<feature>--modifier` の BEM 構成にします。
- 既存の class がある場合は同じ要素に残します。`rr-` hook は追加なので既存 selector と site の override は壊れません。
- Plugin の出力を `rb-` namespace に置かないでください。`rb-*` class と `--rb-*` token は framework の構造 hook と semantic design token です。Plugin 固有 token は `--rr-*` とし、fallback に `--rb-*` を使えます。
- `rr-<feature>__*` と `rr-<feature>--*` は internal な実装詳細です。Theme に style させたい子孫だけを文書化してください。

### 3-11. Client Entries

ブラウザ初期化が必要な場合だけ `clientEntries` を使います。

```ts
clientEntries: [{
  pluginName: "example",
  moduleSpecifier: "@riebeckite/plugin-example/client",
  exportName: "initExample",
  publicConfig: { selector: ".example" },
}]
```

SSR/build-time だけで完結する Plugin に client JavaScript を追加しないでください。`publicConfig` は client initializer に渡され、static host が利用できるよう manifest にも記録されます。Plugin の `options` は自動では client に渡されません。token、credential、private service URL などを公開設定として登録しないでください。

### 3-12. Endpoints / SEO

HTTP endpoint は `endpoints` contract を使います。Route framework 固有の実装を Plugin 本体へ直接埋め込まず、Integration が endpoint contract を host router へ接続します。`seo` は metadata/feed 等の SEO 処理へ参加するための拡張ポイントです。Application route 側で Plugin 固有 SEO ロジックを再実装しないでください。

### 3-13. Diagnostics

```ts
addDiagnostics(context) {
  return [{
    // Diagnostic contract に従う
  }];
}
```

診断は可能な限り structured data として返します。CLI 出力を Plugin が直接 `console.log` するより、Diagnostics / Logger を利用します。

### 3-14. Plugin Cache

`context.cache` は Plugin ごとに分離された **build-time cache** です。

- 再生成可能な値だけを保存
- JSON-serializable な value
- Plugin namespace を越えて参照しない
- `cacheVersion` で互換性を切り替え可能
- corrupt cache は安全に miss として扱える
- write は atomic
- runtime database として使わない

Cloudflare Workers runtime の永続 storage ではありません。

### 3-15. Logger / Tracer

```ts
context.logger.info("...");
await context.tracer.span("plugin.example.work", { plugin: "example" }, async () => {
  // work
});
```

Profiler は structured trace を利用します。Plugin が独自 stopwatch / reporting system を持つ必要はありません。

## 4. 配布用パッケージにする

雛形は `packages/plugins/backlinks` です。推奨構成は次のとおりです。

```text
packages/plugins/example/
├─ index.ts          ← definePlugin を呼ぶ factory、公開部品の再 export
├─ components/       ← コンポーネント（必要なら）
├─ client.ts         ← 必要な場合のみ
├─ src/
│  ├─ remark.ts
│  ├─ rehype.ts
│  ├─ renderer.ts
│  └─ types.ts
├─ style.css         ← 必要な場合のみ
├─ package.json
├─ README_ja.md
└─ README.md
```

外部配布の Plugin package は `@riebeckite/core` だけに依存し、自身が持つ subpath（`./client`、`./components`、`./style.css`）を自 package の `exports` で宣言します。`@riebeckite/core/src/**` を import したり、monorepo 内の path を参照したりしないでください。対応する package surface と現時点の制約は [Framework Reference](../reference/README.md) の「Public package と import path」を参照してください。

NodeNext/ESM package では、build 後に Node が解決できる import を維持してください。開発時の TypeScript loader が extensionless import 等を偶然解決している状態に依存しないでください。

## 5. 検証する

```sh
npm exec riebeckite check              # 設定と Plugin の解決を検証
npm exec riebeckite doctor             # 健全性診断
npm exec riebeckite inspect plugins# 解決済みの Plugin 一覧を確認
npm exec riebeckite build              # 生成物に反映されるか確認
```

解決されない場合は、まず `check` のメッセージで capability エラーや import エラーを確認してください。プラグインを作る前に「本当に Plugin が必要か（設定や App 実装で済まないか）」も確認してください。

## 関連資料

- [はじめてのプラグイン作成](../plugins/writing-a-plugin.md) — 流れに沿った入門
- [Plugin System](./plugin-system.md) — すべての拡張ポイントの詳細
- [Content System](./content-system.md) — Manifest / Graph / pipeline の契約
- [Architecture](./architecture.md) — Core / Plugin / Integration / Theme / App の責務
- [Framework Reference](../reference/README.md) — `definePlugin` などの公開 API


