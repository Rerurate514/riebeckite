# Riebeckite Plugin ガイド

Riebeckite plugin は、Markdown / HTML pipeline、build lifecycle、manifest、
plugin 由来の asset を拡張するための仕組みです。plugin は `definePlugin` で
型付きオブジェクトとして定義します。

Core / Plugin / Feature / Component / Infrastructure の責務境界は
[`architecture_jp.md`](./architecture_jp.md) を参照してください。

## plugin を適用する

`riebeckite.config.ts` の `plugins` に追加します。

```ts
import { defineConfig } from "@riebeckite/core";
import { autoCardLinkPlugin } from "@riebeckite/plugin-autocardlink";
import { lightboxPlugin } from "@riebeckite/plugin-lightbox";

export default defineConfig({
  site: {
    title: "Riebeckite Blog",
    description: "An Obsidian-to-Hono Blog Framework",
    author: "Your Name",
    baseUrl: "https://my-blog.pages.dev",
    locale: "ja_JP",
  },
  plugins: [autoCardLinkPlugin(), lightboxPlugin()],
});
```

無効化したい場合は、`false` / `null` / `undefined` を返すか、`enabled: false`
を指定します。

```ts
const enableLightbox = false;

export default defineConfig({
  // ...
  plugins: [autoCardLinkPlugin(), enableLightbox && lightboxPlugin()],
});
```

実行順を制御したい場合は `order` を使います。小さい値ほど先に実行されます。

```ts
definePlugin({
  name: "my-plugin",
  order: -10,
});
```

## plugin を作る

package または local module として、plugin factory を export します。

```ts
import { definePlugin } from "@riebeckite/core";
import type { Root } from "mdast";

export type ExamplePluginOptions = {
  className?: string;
};

export function examplePlugin(options: ExamplePluginOptions = {}) {
  const className = options.className ?? "rr-example";

  return definePlugin({
    name: "example",
    options,
    extendMarkdownPipeline: (pipeline) => {
      pipeline.use(function remarkExample() {
        return (tree: Root) => {
          // Markdown AST を変換する処理を書く
        };
      });
    },
    assets: [
      {
        pluginName: "example",
        kind: "style",
        moduleSpecifier: "@riebeckite/plugin-example/style.css",
      },
    ],
    clientEntries: [
      {
        pluginName: "example",
        moduleSpecifier: "@riebeckite/plugin-example/client",
        exportName: "initExample",
      },
    ],
    addDiagnostics: () => [
      {
        pluginName: "example",
        severity: "info",
        message: `Example plugin uses ${className}`,
      },
    ],
  });
}
```

options は factory の引数として型を付けることで型安全になります。受け取った
options は `definePlugin` に渡しておくと、plugin 側でも参照できます。

## Markdown / HTML pipeline を拡張する

remark plugin を追加する場合は `extendMarkdownPipeline`、rehype plugin を追加
する場合は `extendHtmlPipeline` を使います。

```ts
return definePlugin({
  name: "custom-html",
  extendHtmlPipeline: (pipeline) => {
    pipeline.use(rehypeCustom, { enabled: true });
  },
});
```

単純な plugin では、`remarkPlugins` / `rehypePlugins` 配列を shorthand として使えます。

## lifecycle hooks

plugin は次の lifecycle に参加できます。

- `onBuildStart(context)`
- `onConfigResolved(context)`
- `onContentLoaded(context)`
- `onPostParsed(context)`
- `onPostProcessed(context)`
- `extendContentGraph(context)`
- `onManifestCreated(context)`
- `addDiagnostics(context)`
- `onBuildEnd(context)`

共通の context には次が含まれます。

- `config`: 解決済み Riebeckite config。利用できる場合のみ入ります
- `contentIndex`: content 名から slug または asset path への map
- `diagnostics`: plugin が共有できる diagnostic list

post 系 hook には次も含まれます。

- `slug`
- `markdown`
- `content`: parsed / processed post hook で利用できます

manifest 系 hook には次が含まれます。

- `manifest`

content graph 系 hook には次が含まれます。

- `entries`

## content graph に参加する

`extendContentGraph` を使うと、manifest の index が組み立てられる前に entry を
追加・変更できます。

```ts
return definePlugin({
  name: "graph-example",
  extendContentGraph: ({ entries }) => {
    for (const entry of entries) {
      if (!entry.tags.includes("processed")) {
        entry.tags.push("processed");
      }
    }
  },
});
```

## assets / clientEntries / diagnostics

`assets` は plugin が提供する CSS/JS module specifier を宣言します。Riebeckite
は `moduleSpecifier` を host bundler で解決し、CSS は app の stylesheet に束ねます。
ブラウザから `/node_modules` や `/riebeckite/plugin-assets` を直接読ませる形にはしません。

```ts
assets: [
  {
    pluginName: "example",
    kind: "style",
    moduleSpecifier: "@riebeckite/plugin-example/style.css",
  },
],
```

ブラウザで初期化処理が必要な plugin は `clientEntries` を宣言します。指定した
module は client bundle に含まれ、page 初期化時に `exportName` の関数が呼ばれます。

```ts
clientEntries: [
  {
    pluginName: "example",
    moduleSpecifier: "@riebeckite/plugin-example/client",
    exportName: "initExample",
  },
],
```

`addDiagnostics` は plugin の message を返します。Riebeckite は返された message
を `manifest.diagnostics` に格納します。

```ts
addDiagnostics: () => [
  {
    pluginName: "example",
    level: "warning",
    message: "Example warning",
  },
],
```

## plugin package template

推奨する package 構成です。

```text
packages/plugin-example/
├── client.ts
├── index.ts
├── package.json
├── style.css
└── src/
    ├── rehype.ts
    ├── remark.ts
    └── types.ts
```

最小の `package.json` 例です。

```json
{
  "name": "@riebeckite/plugin-example",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./client": "./client.ts",
    "./style.css": "./style.css"
  },
  "dependencies": {
    "@riebeckite/core": "workspace:*"
  }
}
```

`"type": "module"` かつ TypeScript の NodeNext module resolution を使う場合、
相対 import には `.js` 拡張子を付けます。

```ts
import { rehypeExample } from "./src/rehype.js";
import type { ExampleOptions } from "./src/types.js";
```
