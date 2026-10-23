---
date: 2026-10-23
title: ダイアグラムプラグイン基盤
sidebar:
  label: ダイアグラムプラグイン基盤
---

# ダイアグラムプラグイン基盤

`@riebeckite/diagram` はダイアグラムプラグイン向けの共有実装層です。HAST 上のフェンス付きコードブロックの検出、キャプションの解決、診断の報告、アクセシブルな figure の出力、ブラウザーレンダラーの起動を共通化します。

このパッケージはプラグイン作者向けです。単体でサイトの機能を追加するものではなく、[Core のプラグイン契約](./plugin-system.ja.md)を置き換えるものでもありません。

## 責務の境界

このパッケージは `@riebeckite/core` に依存しますが、HonoX、ブラウザーレンダラー、Puppeteer、ダイアグラムエンジンには依存しません。ダイアグラムプラグインは、エンジン、設定、スタイル、失敗時の方針を引き続き所有します。

`defineDiagramPlugin()` は、共通のプラグイン形状を Core へ接続します。

- プラグイン名、順序、オプション、オプション検証
- `processedContentCache`
- rehype トランスフォーマー
- 任意のスタイルシートとページスコープのクライアントエントリー

レンダリングエンジンを選んだり、Core のキャッシュ方針をこのパッケージへ移したりはしません。

## ダイアグラムプラグインを作る

標準的なダイアグラムプラグインの形に当てはまる場合は、`defineDiagramPlugin()` を使います。Core の `processedContentCache` 方針と、解決済みオプションを受け取る rehype ファクトリーを渡してください。

```ts
import { defineDiagramPlugin } from "@riebeckite/diagram";
import rehypeExampleDiagram from "./rehype.js";

export function exampleDiagram() {
  return defineDiagramPlugin({
    name: "example-diagram",
    processedContentCache: {
      version: "example-v1",
      dependencyMode: "none",
    },
    rehype: () => rehypeExampleDiagram,
    style: ".rb-example-diagram { display: block; }",
    client: {
      moduleSpecifier: "@riebeckite/plugin-example-diagram/client",
      exportName: "initExampleDiagram",
    },
  });
}
```

エンジン固有の初期化はファクトリーの外に置きます。たとえばビルド時レンダラーではブラウザープロセスや WASM リソースが必要になる場合があり、ブラウザーレンダラーではライブラリの動的インポートが必要になる場合があります。

## フェンス付きコードブロックを figure に変換する

`findDiagramBlocks()` は対象となる `pre > code` ブロックを見つけ、元のノードを置換するために必要な source、language、parent、index を返します。`resolveDiagramCaption()` はまずコードブロックの title を読み、次にプラグイン固有のキャプション戦略を試します。`reportDiagramDiagnostic()` は不正な source をコンテンツ処理の診断経路で報告します。

`buildDiagramFigure()` は共通の figure 契約を出力します。

- `data-diagram` はダイアグラムの kind を識別します。
- `data-diagram-status` は `pending`、`rendered`、`error` のいずれかです。
- `data-diagram-id` は安定した figure ID です。kind と source から決められる場合は `deterministicDiagramId()` を使います。
- `data-diagram-content` は canvas、image、SVG container を示します。
- `data-diagram-caption` と `data-diagram-fallback` は任意の caption と source fallback を示します。

ヘルパーはキャプションをコンテンツの前に置き、アクセシブルなラベルを関連付けます。描画に失敗したときにも source を見せる場合は `fallback: true` を指定します。

```ts
const figure = buildDiagramFigure({
  kind: "example",
  className: "rb-example-diagram",
  id: deterministicDiagramId("example", block.source),
  source: block.source,
  caption: resolveDiagramCaption(block),
  label: "Example diagram",
  content: { kind: "canvas" },
  fallback: true,
  status: "pending",
});
```

このパッケージは HAST の構築・走査ヘルパーも提供します。これらはダイアグラム変換にだけ使い、構文の解析や意味的な検証は各プラグインに残してください。

## ブラウザーレンダリングと SPA ナビゲーション

ページクライアントの初期化処理では `renderPendingDiagrams()` を使います。渡された root に対象を限定し、abort signal を尊重して、成功した figure を `rendered` に更新し、失敗時には fallback を開きます。レンダラーはクリーンアップ関数を返せます。初期化処理はそれらをまとめたクリーンアップを返します。

```ts
import { renderPendingDiagrams } from "@riebeckite/diagram/client";

export async function initExampleDiagram({ root, signal }) {
  return renderPendingDiagrams(
    "example",
    async (figure) => {
      const canvas = figure.querySelector("canvas[data-diagram-content]");
      if (!canvas) return;
      const instance = renderExample(canvas);
      return () => instance.destroy();
    },
    { root, signal },
  );
}
```

このヘルパーは別の SPA ライフサイクルを作りません。ページクライアントエントリーのマウントと破棄は Core の `ClientLifecycle` が所有します。周辺のトランザクションとキャンセルについては [SPA ランタイムの内部実装](./spa-runtime.ja.md) を参照してください。

ブラウザーレンダラーがエンジン固有の色を選ぶ必要がある場合、`detectDiagramTheme()` で現在の `light` / `dark` 設定を取得できます。

## ビルド時のレンダラーリソース

ビルド時に描画するエンジンでは、`createRenderSession()` がレンダリングを直列化し、任意の遅延読み込みリソースを管理します。レンダラーには abort signal が渡され、不正な入力、レンダラーエラー、タイムアウト、キャンセルを分類します。セッションを破棄するとリソースもクリーンアップされます。

セッションはユーティリティであり、エンジンの方針を強制しません。リソースの起動、再試行回数、タイムアウト、クリーンアップはレンダラーごとの要件に合わせて決めてください。

## 導入状況

このパッケージは関心ごと単位で導入できます。共有 HAST ヘルパーはダイアグラムプラグイン群で使われていますが、共通 figure とブラウザーレンダリングの契約を使っているのは現在 Chart.js プラグインです。ほかのダイアグラムプラグインは移行されるまで、既存のマークアップやレンダラーライフサイクルを維持できます。

ダイアグラムプラグインを変更するときは、既存のコンテンツキャッシュとインクリメンタルビルドの挙動を保ち、変換とクライアント側クリーンアップのテストを追加してください。一般的なパイプラインの構成は [コンテンツ処理と拡張ポイント](./plugin-system/pipeline.ja.md) を参照してください。
