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

fixture を切り替える場合は `render` に `fixtureId` と `pageId` を渡します。fixture
の切り替え時にはコンテンツ索引を作り直すため、前の fixture のリンクが残りません。

## 複数ページ fixture

他のコンテンツを解決するプラグイン向けに、小さなインメモリ Markdown サイトを fixture に含められます。既定ページは `currentPageId` で指定し、別のページを表示するには `render` に `pageId` を渡します。パスは `.md` で終える必要があり、コンテンツの検索とパーマリンクの解決に使われます。

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

対応するのは fixture 内のコンテンツだけです。クライアントエントリの実行、サイトのビルド、外部連携へのアクセスは行いません。

## ブラウザ対応の宣言

プラグインを `browser` として登録できるのは、ファクトリとパイプラインフックがブラウザ互換のプレビューで検証済みの場合だけです。`node` と `unsupported` のプラグインは実行せず、診断を返します。

このパッケージはプラグインのクライアントエントリを実行しません。対話的なクライアント動作を許可する場合は、ホスト側で明示的に許可し、隔離してください。

## Document と UI

`createPreviewDocument` に渡すのは、サニタイズ済みの HTML とホストが信頼する CSS だけにしてください。生成される iframe 文書には制限付き CSP が付きます。`mountPreview` は sandboxed iframe に設定します。scripts、forms、iframe 埋め込みは許可しません。CSP 上では HTTPS と data URL の画像のみ許可します。

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

`transport` は明示的な依存です。上記のローカル描画、静的 fixture、ホスト API を選べます。`transport` を渡さない既存の `endpoint` は引き続き `/api/playground` が既定です。Theme や Color Mode の変更では Markdown を再実行せず、iframe 文書だけを更新します。mode は `light`、`dark`、`system` に対応します。

## API

- `createPreview(options?)`：状態を分離したプレビューセッションを作成します。
- `createPreviewRegistry(input)`：fixture とプラグイン ID を検証します。
- `definePluginPreview(preview)`：型付きのプラグインプレビュー定義を保持します。
- `PreviewPlugin.options`：boolean、string、number、enum の操作項目を宣言します。
- `PreviewPlugin.modes`：static、site、client、build、integration の対応モードを示します。
- `validatePreviewOptions(definitions, input)`：不明または不正な値を拒否します。
- `parsePreviewInput(input, registry)`：プレビュー入力オブジェクトをレジストリに対して検証します。
- `parsePreviewRequest(request, registry)`：サイズを制限した JSON リクエストを読み取り、検証します。
- `createPreviewDocument(options)`：サニタイズ済み HTML と信頼済みホスト CSS から、CSP 制限付き iframe 文書を作成します。
- `@riebeckite/preview/ui` の `createPreviewUiController(options)` はリクエスト状態を、`createPreviewSessionTransport(session)` はローカル描画を、`mountPreview(root, options)` は単一 Preview Root の DOM 更新を担当します。必要に応じて dispose してください。
- `initPluginPreviews(options)` は既存互換の DOM 検出ヘルパーです。Observer と mount 済み root を破棄する disposer を返します。
- `PreviewSession.render(input)`：サニタイズ済み HTML と診断を返します。
- `PreviewSession.dispose()`：内部のプラグインランタイムを破棄します。
