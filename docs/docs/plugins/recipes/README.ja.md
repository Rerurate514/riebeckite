---
date: 2026-10-20
title: プラグイン機能別レシピ
sidebar:
  label: プラグイン機能別レシピ
  order: 0
---
# プラグイン機能別レシピ

[はじめてのプラグイン作成](../writing-a-plugin.ja.md)では、空のフォルダから動くディレクティブまでを一続きで作りました。このページはその次の段階として、よく使う拡張ポイント別に小さなレシピをまとめています。

各レシピは独立しています。必要なものを `extensions/` にコピーし、`riebeckite.config.ts` に登録して、ブラウザまたはビルド出力で確認してください。ここでは「何を作るか」を優先し、正確な取り決めは [Plugin API](../../reference/plugin-api.ja.md) に譲ります。

プラグインは信頼されたアプリケーションコードです。HTML を組み立てるレシピでは、外部から来た値を必ずエスケープします。URL を出す場合は、その用途に合った形で検証します。Riebeckite はプラグインが生成した HTML をサニタイズしません。[セキュリティモデル](../../security.ja.md)も参照してください。

## レシピ共通の準備

レシピは `create-riebeckite` で作ったサイトと、`extensions/` に置くローカルプラグインを前提にしています。ローカルプラグインに専用のパッケージは要りません。

まず最小のプラグインを用意します。

```ts
import { definePlugin } from "@riebeckite/core";

export function example() {
  return definePlugin({
    name: "example",
  });
}
```

設定に登録します。

```ts
import { defineConfig } from "@riebeckite/core";
import { example } from "./extensions/example";

export default defineConfig({
  plugins: [example()],
});
```

各レシピは独自のファクトリを定義します。`extensions/` に置き、`example` の代わりに登録してください。`name` は有効なプラグインの中で一意にしてください。プラグインのキャッシュと生成出力の名前空間は、この `name` が所有します。

## レシピ一覧

| やりたいこと | 拡張ポイント | レシピ |
| --- | --- | --- |
| Markdown / HTML を変換する | `remarkPlugins`、`rehypePlugins`、パイプライン | [1](./transform.ja.md) |
| 埋め込まれたファイルを描画する | `renderers` | [2](./renderers.ja.md) |
| ビルド中にコンテンツを読む | `onConfigResolved`、`onContentLoaded`、`onPostParsed`、`onPostProcessed`、`onManifestCreated` | [3](./content-hooks.ja.md) |
| 公開 URL を変える | `resolveContentLocations`、`extendContentLocations` | [4](./urls.ja.md) |
| グラフとバックリンクにリンクを追加する | `extendContentGraph` | [5](./content-graph.ja.md) |
| 独立したページを追加する | `pageTypes` | [6](./pages.ja.md) |
| UI コンポーネントを配布する | パッケージの export | [7](./components.ja.md) |
| CSS とブラウザ動作を追加する | `assets`、`clientEntries` | [8](./assets-and-client-entries.ja.md) |
| JSON などの HTTP 応答を返す | `endpoints` | [9](./endpoints.ja.md) |
| タイトル、フィード、構造化データを変える | `seo` | [10](./seo.ja.md) |
| コンテンツの問題を報告する | `addDiagnostics`、`inspectGeneratedHtml` | [11](./diagnostics.ja.md) |
| ビルド間で派生データを再利用する | `cacheVersion`、`context.cache` | [12](./cache.ja.md) |
| ビルド中にファイルを書き出す | `planGeneratedOutputs`、`context.output` | [13](./generated-files.ja.md) |
| 実行順を制御し、オプションを検証する | `provides`、`requires`、`optional`、`order`、`validateOptions` | [14](./dependencies-and-options.ja.md) |
| ビルドの動作を記録する | `logger`、`tracer` | [15](./logging-and-tracing.ja.md) |

## 各レシピの確認方法

| レシピ | 確認すること |
| --- | --- |
| 変換 | 期待したマークアップが生成 HTML に出る |
| レンダラー | `![[data.csv]]` でプレビューが出て、通常のリンクも動く |
| コンテンツフック | CLI にプラグイン名付きの診断が出る |
| 公開 URL | 新しい URL が動き、古い URL がリダイレクトする |
| グラフ | 関連ノートがバックリンクとグラフの隣接ノードに出る |
| ページタイプ | `/series/typescript` が生成され、ノートが並ぶ |
| コンポーネント | サイトが import し、指定した位置に描画する |
| CSS とクライアント | スタイルが読み込まれ、ページ読み込み後にボタンが動く |
| エンドポイント | 開発サーバーが期待した JSON とキャッシュヘッダーを返す |
| SEO | ページのソース、サイトマップ、フィードが新しいメタデータを使う |
| 診断 | 想定したノートに警告が出る |
| キャッシュ | 2 回目のビルドで再利用され、内容を変えるとミスになる |
| 生成ファイル | 出力にファイルがあり、内容が期待どおり |
| 依存関係 | 提供側がないときに明確なエラーになる |
| ログ | debug レベルでのみデバッグメッセージが出る |

静的出力に影響するレシピは `npm run build` で確認します。ブラウザでの動作は `npm run dev` で確認し、コンソールとネットワークパネルを見てください。

[はじめてのプラグイン作成](../writing-a-plugin.ja.md#プラグインをテストする) のテストの考え方は、どのレシピにも当てはまります。パッケージ開発のテスト規約は [テスト](../../framework/testing.ja.md) を参照してください。

## よくある間違い

- 公開出力で `manifest.entries` を読む。下書きも含まれるため、`publicEntries` か `discoverableEntries` を使う。
- 担当外の対象でレンダラーが空文字を返す。`null` を返して別のレンダラーに任せる。
- frontmatter、ファイル、リモート応答の値をエスケープしない。
- `publicConfig` に秘密情報を入れる。ブラウザへ送られるのはこの値だけ。
- `processedContentCache` なしで変換を追加する。処理済みコンテンツを再利用できなくなる。
- エンドポイントが静的ファイルになると想定する。静的出力には生成ファイルを使う。
- 依存関係のない出力を計画する。実行時に拒否される。
- リダイレクトなしでパーマリンクを変える。古いリンクが壊れるため、公開していた URL ならリダイレクトを追加してください。
- `order` でケイパビリティの依存関係を覆そうとする。提供側は常に先に実行される。

## 関連ページ

- [はじめてのプラグイン作成](../writing-a-plugin.ja.md)
- [Plugin API](../../reference/plugin-api.ja.md)
- [Plugin System](../../framework/plugin-system.ja.md)
- [テスト](../../framework/testing.ja.md)
- [セキュリティモデル](../../security.ja.md)
- [アクセシビリティ](../../accessibility.ja.md)
