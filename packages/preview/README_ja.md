# @riebeckite/preview

Riebeckite の Markdown と選択したプラグインを、安全にプレビューするための共有ランタイムです。

[English](./README.md)

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

`createPreview` は公開済みの Riebeckite `PluginRuntime` と Markdown
`Pipeline` を実行し、最終 HTML を公開プレビューの境界でサニタイズします。

## ブラウザ対応の宣言

プラグインを `browser` として登録できるのは、ファクトリとパイプラインフックがブラウザ互換のプレビューで検証済みの場合だけです。`node` と `unsupported` のプラグインは実行せず、診断を返します。

このパッケージはプラグインのクライアントエントリを実行しません。対話的なクライアント動作を許可する場合は、ホスト側で明示的に許可し、隔離してください。

## API

- `createPreview(options?)`：状態を分離したプレビューセッションを作成します。
- `createPreviewRegistry(input)`：fixture とプラグイン ID を検証します。
- `definePluginPreview(preview)`：型付きのプラグインプレビュー定義を保持します。
- `PreviewPlugin.options`：boolean、string、number、enum の操作項目を宣言します。
- `validatePreviewOptions(definitions, input)`：不明または不正な値を拒否します。
- `PreviewSession.render(input)`：サニタイズ済み HTML と診断を返します。
- `PreviewSession.dispose()`：内部のプラグインランタイムを破棄します。
