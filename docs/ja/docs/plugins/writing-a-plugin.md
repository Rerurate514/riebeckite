# はじめてのプラグイン作成

プラグインは**機能**（Markdown/HTML の変換、クライアント動作、独立ページ、SEO、診断など）を足す仕組みです。見た目を変えたいときはテーマ（[はじめてのテーマ作成](../themes/writing-a-theme.md)）を使います。Plugin の独立ページは Site の共通 route で表示します。Site 固有の画面だけを App（`app/`）の route に置いてください。

プラグインが HTML や外部 URL を生成する場合は、表示する値や URL を安全に扱う必要があります。特に、外部から取得したデータやユーザー入力をそのまま HTML に埋め込まないでください。
Riebeckite がどこまで安全性を保証し、プラグイン側で何を確認する必要があるかは、[セキュリティモデル](../security.md) を参照してください。

Plugin がボタンやメニューなどの UI を表示する場合は、キーボードでも操作できるようにしてください。
基本的な考え方や注意点は、[アクセシビリティ](../accessibility.md) を参照してください。

「最小のプラグインを作る」→「CSS を足す」→「Markdown を変換する」の順で進めます。

## 1. 最小のプラグインを作る

プラグインは `definePlugin`（`@riebeckite/core` から import）で作ります。**パッケージにする必要はなく、サイトの中に置けます**。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
  });
}
```

`riebeckite.config.ts` の `plugins` 配列に追加します。

```ts
// riebeckite.config.ts
import { localPlugin } from "./extensions/local-plugin";

export default defineConfig({
  plugins: [localPlugin()],
  // ...
});
```

`name` だけのプラグインは「何もしない」最小構成です。オプションを渡したい場合は factory に引数を付けて型を付けます。

```ts
type LocalOptions = { enabled?: boolean };

export function localPlugin(options: LocalOptions = {}) {
  return definePlugin({ name: "local", options });
}
```

## 2. CSS を足す

Plugin 固有の stylesheet は `assets` で宣言します。サイトに CSS をコピーしたり、ブラウザから `/node_modules` を直接参照させたりしないでください。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

export function localPlugin() {
  return definePlugin({
    name: "local",
    assets: [
      {
        pluginName: "local",
        kind: "style",
        moduleSpecifier: "/extensions/plugin.css",
      },
    ],
  });
}
```

- `moduleSpecifier` は host bundler が解決できるものを指定します。site 内プラグインでは `/extensions/plugin.css` の形です。
- 描画する最外要素には安定した root hook（`rr-<feature>`）を付けます。CSS の規約は [Plugin System](../reference/plugin-api.md) を参照してください。

## 3. Markdown / HTML を変換する

マークダウンの意味変換は Plugin の責務です。簡単な remark プラグインは配列で宣言できます。

```ts
// extensions/local-plugin.ts
import { definePlugin } from "@riebeckite/core";

function remarkLocal() {
  return (tree: unknown) => {
    // tree（Markdown AST）を加工する
    return tree;
  };
}

export function localPlugin() {
  return definePlugin({ name: "local", remarkPlugins: [remarkLocal] });
}
```

pipeline 自体を細かく構成したい場合は `extendMarkdownPipeline` / `extendHtmlPipeline` を使います。その他の拡張ポイント（依存関係・lifecycle・renderer・endpoint など）は [Plugin System](../reference/plugin-api.md) を参照してください。

## 4. 独立ページを追加する（必要な場合）

独立画面には `pageTypes` を使います。Page Type は HTML body を返し、Site の共通 catch-all route が document frame と Theme を適用します。Plugin 固有の HonoX route は追加しません。Canvas、Bases、Excalidraw のような記事本文への埋め込みは `renderers` のままです。

```ts
pageTypes: [{
  id: "local.report",
  paths: ["/report"],
  resolve: ({ pathname }) => pathname === "/report"
    ? { type: "local.report", pathname, title: "Report", body: "<p>Ready</p>" }
    : null,
}],
```

scaffold が生成する HonoX route はすでに `resolveRiebeckiteRoute` と `pluginPageSsgParams` を使います。ID は全体で一意にし、動的ページの SSG path は public manifest から導き、所有しない path では `null` を返してください。責務と接続全体は [Page System](../framework/page-system.md) を参照してください。

## 5. 配布用パッケージにする（任意）

site 内プラグインとして動けば、パッケージにできます。雛形は `packages/plugins/backlinks` です。

```text
packages/plugins/backlinks/
├─ index.ts              ← definePlugin を呼ぶ factory、公開部品の再 export
├─ components/           ← コンポーネント（必要なら）
├─ src/                  ← 実装（型・ヘルパーなど）
├─ styles/style.css      ← プラグインの CSS
├─ package.json          ← "." / "./components" / "./style.css" を exports で公開
├─ README_ja.md
└─ README.md
```

外部配布のプラグインは `@riebeckite/core` だけに依存し、自身の subpath を `exports` で宣言します。`@riebeckite/core/src/**` を import したり、monorepo 内の path を参照したりしないでください。

## 6. 検証する

```sh
npm exec riebeckite check              # 設定と Plugin の解決を検証
npm exec riebeckite doctor             # 健全性診断
npm exec riebeckite inspect plugins# 解決済みの Plugin 一覧を確認
npm exec riebeckite build              # 生成物に反映されるか確認
```

`check` / `doctor` / `inspect` は読み取り専用です。解決されない場合は、まず `check` のメッセージで capability エラーや import エラーを確認してください。プラグインを作る前に「本当に Plugin が必要か（設定や App 実装で済まないか）」も確認してください。

## UI の提供方法

Plugin が UI を追加する方法はいくつかあります。最小のものを選んでください。優劣の順列ではなく、組み合わせてもかまいません。

```text
UI / output を提供したい
│
├─ Markdown / HTML 自体を変換する
│    └─ remark / rehype pipeline
│
├─ 埋め込み content を描画する
│    └─ renderers
│
├─ 独立ページを提供する
│    └─ pageTypes
│
├─ 記事 layout へ自動配置する
│    └─ HTML fragment + body Slot
│
├─ Site 作者に配置を任せる
│    └─ Hono JSX component を export
│
└─ Browser 側で強化する
     └─ clientEntries（必要なら Site 所有の Island）
```

### body Slot で自動配置する

出力が標準の位置にあり、Plugin を有効化すればすぐ表示したい場合は body Slot を使います。HTML fragment を提供し、Site が slot を描画するかどうかと位置を決めます。

```ts
import { appendContentBodySlot } from "@riebeckite/core";

appendContentBodySlot(entry, "article.footer", "<section>...</section>");
```

`article.footer` などの標準 slot を選ぶか、独自名を Site に描画してもらいます。独自 slot は Site が描画を選ぶまで何も表示しません。slot の一覧と順序は [Body Slots](../reference/plugin-api.md#body-slots) を参照してください。

### Hono JSX component で手動配置する

UI の配置を Site 作者に任せたい場合は、通常の Hono JSX component を export します。component registry や Plugin 固有の component API はありません。ほかの component と同じように import して組み合わせます。

package の `exports` に `./components` subpath を宣言し、component module の default export を保ちます。必要なら同じ component を package root から名前付きでも再 export します。既存 Plugin はこの形です。

```ts
import { Backlinks } from "@riebeckite/plugin-backlinks";
import { TableOfContents } from "@riebeckite/plugin-toc";
import { SearchBar } from "@riebeckite/plugin-search";
import BacklinksDefault from "@riebeckite/plugin-backlinks/components";
```

`color-mode` は root のみの形です。`ColorModeScript` と `ColorModeToggle` を package root から公開し、`./components` subpath を持ちません。名前は各 package README に従ってください。

### HTML fragment と component の使い分け

判断基準は **誰が配置するか** です。

- **HTML fragment + Slot**: Plugin が標準の位置へ書き、Site がその slot を描画するか決めます。
- **Hono JSX component**: Site 作者が component tree の好きな場所へ配置します。

新しいから優れている、という関係ではありません。Plugin がすでに HTML を生成している場合（HAST 変換など）は文字列が自然で、props と配置を Site が制御したい場合は component が自然です。`backlinks` と `local-graph` は両方を使い、component を export しつつ `onManifestCreated` で描画結果を `article.footer` へ追加します。よくある pattern であり、必須ではありません。

### Browser 強化と Island

Plugin は `app/islands/` を所有せず、Riebeckite に Plugin 用 Island registry もありません。Browser 側の動作が必要な場合は、server-render 済み DOM を強化する `clientEntries` initializer を提供するか、component state が必要なら Site が Plugin component を自前の HonoX Island で包みます。`garden-explorer` は Page Type と client entry を組み合わせた特殊例であり、必須の pattern として一般化しないでください。詳しくは [Client Entries](../reference/plugin-api.md#client-entries) を参照してください。

## 関連資料

- [プラグイン作成の詳細](../framework/plugin-system.md) — この入門の詳細編（拡張ポイント・capability・lifecycle・配布）
- [Plugin System](../reference/plugin-api.md) — すべての拡張ポイントの詳細
- [Architecture](../framework/architecture.md) — Core / Plugin / Integration / Theme / App の責務
- [Framework Reference](../reference/README.md) — `definePlugin` などの公開 API
