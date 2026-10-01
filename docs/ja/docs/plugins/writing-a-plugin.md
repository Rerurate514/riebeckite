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

## 関連資料

- [プラグイン作成の詳細](../framework/plugin-system.md) — この入門の詳細編（拡張ポイント・capability・lifecycle・配布）
- [Plugin System](../reference/plugin-api.md) — すべての拡張ポイントの詳細
- [Architecture](../framework/architecture.md) — Core / Plugin / Integration / Theme / App の責務
- [Framework Reference](../reference/README.md) — `definePlugin` などの公開 API
