# @riebeckite/honox

Riebeckite の HonoX / Vite 統合です。移植可能な Core の振る舞いを HonoX アプリケーションへ接続します。アプリケーション・設定ルートの解決、Vite の開発・ビルドワークフロー、静的生成（SSG）、Plugin と Theme の生成スタイル、サーバーへのマウント、公開 UI primitive を担います。

[English](./README.md)

## 概要

`@riebeckite/honox` はフレームワークの橋渡しです。Core は移植可能なままに保ち、HonoX・Vite・Cloudflare に固有の処理はすべてここに置きます。サイトは `vite.config.ts` で integration を登録し、HonoX サーバーで Riebeckite のエンドポイントをマウントし、公開 UI primitive を `@riebeckite/honox/ui` から読み込みます。

## インストール

```sh
pnpm add @riebeckite/core @riebeckite/honox honox hono vite
```

`@riebeckite/honox` は Core、HonoX、Vite を依存に持ちますが、サイト自身のビルド設定のために `honox`、`hono`、`vite` も直接インストールします。

## 使い方

`vite.config.ts` で integration を登録します。

```ts
import path from "node:path";
import { fileURLToPath } from "node:url";
import build from "@hono/vite-build/cloudflare-workers";
import {
  riebeckite,
  riebeckiteSsg,
  riebeckiteSsgExtensionMap,
} from "@riebeckite/honox";
import honox from "honox/vite";
import { defineConfig } from "vite";

const appRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    honox({ client: { input: ["/app/client.ts", "/app/style.css"] } }),
    riebeckite({ appRoot }),
    build(),
    riebeckiteSsg({
      entry: path.join(appRoot, "app/server.ts"),
      extensionMap: riebeckiteSsgExtensionMap(),
    }),
  ],
});
```

HonoX サーバーに Plugin のエンドポイントをマウントします。

```ts
import { mountRiebeckiteEndpoints } from "@riebeckite/honox/server";
import { createApp } from "honox/server";

const app = createApp({
  init: (app) => {
    mountRiebeckiteEndpoints(app, { config, content });
  },
});
```

`appRoot` は既定で Vite の root になり、`content.directory` の基準になります。`configRoot` は既定で `appRoot` になり、`riebeckite.config.*` を読み込む場所を決めます。インストールした npm consumer に `workspaceRoot` は不要です。

## 公開 API

### `@riebeckite/honox`

- `riebeckite(options?)` — Vite Plugin（`configRoot`、`appRoot`、`configFile`、monorepo 開発専用の `workspaceRoot` を受け取る）
- `riebeckiteSsg(options?)` / `riebeckiteSsgExtensionMap()` — SSG 統合
- `loadRiebeckiteConfig`、`resolveHonoxConfig`
- `resolveHonoxApplication`、`resolveHonoxApplicationRoot`、`buildHonoxApplication`、`startHonoxDevServer`
- 型: `RiebeckiteSsgOptions`、`ResolveHonoxApplicationOptions`、`ResolvedHonoxApplication`

### `@riebeckite/honox/server`

- `mountRiebeckiteEndpoints(app, { config, content })`
- `resolveContentRoute(manifest, path)`
- 型: `ResolvedContentRoute`

### `@riebeckite/honox/ui`

構造を組み立てるための primitive のみを公開します。`Article`、`ArticleLayout`、`ArticleHeader`、`ArticleContent`、`ArticleMeta`、`ArticleFooter`、`Sidebar` と、対応する公開 `*Props` 型です。semantic な HTML、安定した `rb-*` のスタイルフック、`class` / `className` の合成だけを提供し、コンテンツ、レイアウト、island、CSS はサイトが所有します。

## 関連資料

- [HonoX Integration](../../../docs/ja/docs/framework/honox-integration.md)
- [CLI Reference](../../../docs/ja/docs/reference/cli.md)
- [Configuration](../../../docs/ja/docs/reference/configuration.md)
- [Plugin System](../../../docs/ja/docs/reference/plugin-api.md) / [Theme System](../../../docs/ja/docs/reference/theme-api.md)

