---
date: 2026-11-01
title: プレビュー API
sidebar:
  label: プレビュー API
  order: 35
---
# プレビュー API

`@riebeckite/preview` は、Markdown とプラグインの出力をブラウザで確認するためのランタイムです。公開済みの `PluginRuntime` と Markdown パイプラインを実行し、結果の HTML をプレビューの境界で無害化します。

サイトのビルドや、プラグインのクライアントエントリの実行は行いません。

## 使い方

```ts
import { codeTabs } from "@riebeckite/plugin-code-tabs";
import { createPreview, definePluginPreview } from "@riebeckite/preview";

const preview = createPreview({
  plugins: [
    definePluginPreview({
      id: "code-tabs",
      title: "Code tabs",
      availability: "browser",
      fixtures: [{ id: "basic", title: "Basic", markdown: "# Hello" }],
      options: {
        syncTabs: { type: "boolean", title: "Sync labels", default: false },
      },
      create: (options) => codeTabs(options),
    }),
  ],
});

const result = await preview.render({
  markdown: '```ts tab="TypeScript"\nconst answer = 42;\n```',
  pluginId: "code-tabs",
});
```

`render` には `fixtureId` と `pageId` を渡せます。フィクスチャを変更するとインデックスが作り直されるため、前のフィクスチャに対してリンクが解決されることはありません。

## 複数ページのフィクスチャ

ほかのコンテンツを解決するプラグイン向けに、フィクスチャの中へ小さな Markdown サイトを持たせられます。

```ts
fixtures: [{
  id: "notes",
  title: "Notes",
  markdown: "[[Guide]]",
  currentPageId: "home",
  pages: [
    { id: "home", title: "Home", path: "notes/Home.md", markdown: "[[Guide]]" },
    { id: "guide", title: "Guide", path: "notes/Guide.md", markdown: "# Guide" },
  ],
}]
```

`path` は `.md` で終わる必要があります。解決できるのはフィクスチャ内のコンテンツだけで、外部の統合やサイトのビルドにはアクセスしません。

## プラグインの対応状況

`availability` に `browser` を指定できるのは、ファクトリとパイプラインフックがブラウザで動くことを確認済みのプラグインだけです。`node` と `unsupported` のプラグインは実行されず、診断が返ります。

## 画面に埋め込む

```ts
import { createPreview } from "@riebeckite/preview";
import {
  createPreviewSessionTransport,
  mountPreview,
} from "@riebeckite/preview/ui";

const session = createPreview();
const dispose = mountPreview(document.querySelector("[data-plugin-preview]")!, {
  themeStyles: { default: themeCss },
  pluginStyles: [],
  transport: createPreviewSessionTransport(session),
});

dispose();
await session.dispose();
```

`createPreviewDocument` は、無害化済みのプレビュー HTML と、ホストが管理する信頼できる CSS だけに使います。CSP を絞った iframe のコンテンツを作るため、サンドボックス化した iframe に埋め込みます。スクリプト、フォーム、フレームの埋め込みは有効になりません。

## API

- `createPreview(options?)` — 独立したプレビューセッションを作る
- `createPreviewRegistry(input)` — フィクスチャとプラグイン ID を検証する
- `definePluginPreview(preview)` — 型付きのプラグイン記述を定義する
- `validatePreviewOptions(definitions, input)` — 未知のオプションや不正な値を拒否する
- `parsePreviewInput(input, registry)` — レジストリに対して入力オブジェクトを検証する
- `parsePreviewRequest(request, registry)` — サイズ上限つきの JSON リクエストを読む
- `createPreviewDocument(options)` — CSP を絞った iframe ドキュメントを作る
- `createPreviewUiController(options)` — リクエスト状態を扱う（`@riebeckite/preview/ui`）
- `mountPreview(root, options)` — 1つのプレビュー領域を描画する
- `mountThemePreview(root, options)` — テーマ用のプレビューを描画する
- `PreviewSession.render(input)` — 無害化した HTML と診断を返す
- `PreviewSession.dispose()` — ランタイムを破棄する

## 関連

- [公開パッケージ](./packages.ja.md)
- [Plugin API](./plugin-api.ja.md)
- [プラグインを書く](../plugins/writing-a-plugin.ja.md)
