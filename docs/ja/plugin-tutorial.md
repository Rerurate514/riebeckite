# はじめてのプラグイン作成

プラグインは**機能**（Markdown/HTML の変換、クライアント動作、SEO、診断など）を足す仕組みです。見た目を変えたいときはテーマ（[はじめてのテーマ作成](./theme-tutorial.md)）、サイト固有の route を足したいときは App（`app/`）です。

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
- 描画する最外要素には安定した root hook（`rr-<feature>`）を付けます。CSS の規約は [Plugin System](./plugin-system.md) を参照してください。

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

pipeline 自体を細かく構成したい場合は `extendMarkdownPipeline` / `extendHtmlPipeline` を使います。その他の拡張ポイント（依存関係・lifecycle・renderer・endpoint など）は [Plugin System](./plugin-system.md) を参照してください。

## 4. 配布用パッケージにする（任意）

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

## 5. 検証する

```sh
npm exec riebeckite check              # 設定と Plugin の解決を検証
npm exec riebeckite doctor             # 健全性診断
npm exec riebeckite inspect plugins# 解決済みの Plugin 一覧を確認
npm exec riebeckite build              # 生成物に反映されるか確認
```

`check` / `doctor` / `inspect` は読み取り専用です。解決されない場合は、まず `check` のメッセージで capability エラーや import エラーを確認してください。プラグインを作る前に「本当に Plugin が必要か（設定や App 実装で済まないか）」も確認してください。

## 関連資料

- [プラグイン作成の詳細](./plugin-in-depth.md) — この入門の詳細編（拡張ポイント・capability・lifecycle・配布）
- [Plugin System](./plugin-system.md) — すべての拡張ポイントの詳細
- [Architecture](./architecture.md) — Core / Plugin / Integration / Theme / App の責務
- [Framework Reference](./framework-reference.md) — `definePlugin` などの公開 API