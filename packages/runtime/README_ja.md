# @riebeckite/runtime

ブラウザ上のインタラクティブ処理を共通のライフサイクルで扱うための型付き契約です。

[English](./README.md)

## インストール

```sh
pnpm add @riebeckite/runtime
```

## 使い方

Runtime を定義して Registry に登録し、マウントスコープごとにインスタンスを
生成します。コアのエントリは DOM やブラウザグローバルに依存しません。

```ts
import { defineInteractiveRuntime, InteractiveRuntimeRegistry } from "@riebeckite/runtime";

const calculator = defineInteractiveRuntime({
  id: "calculator",
  kind: "main",
  capabilities: ["dom"],
  create: () => ({
    start: async () => {},
    invoke: (input: { left: number; right: number }) => input.left + input.right,
    stop: () => {},
  }),
});

const registry = new InteractiveRuntimeRegistry();
registry.register(calculator);

const runtime = registry.create("calculator", { root: element });
await runtime.mount();
const total = await runtime.invoke({ left: 2, right: 3 });
await runtime.dispose();
```

インスタンスの状態は `created`、`starting`、`ready`、`running`、`stopping`、
`disposed`、`failed` と遷移します。起動中と準備完了後の `mount()` は冪等で、
`dispose()` も冪等です。失敗したインスタンスは再利用できません。インスタンス
のシグナルを中断すると破棄されます。

## アダプタ

`@riebeckite/runtime/client` エントリがブラウザ向けアダプタを提供します。

- `createMainRuntime` は信頼済みコードをページ上で実行し、不透明なルートに
  マウントします。サンドボックスではありません。
- `createWorkerRuntime` は型付きの要求・応答プロトコル、キャンセル、タイム
  アウト、Transferable、クラッシュ処理、プロセス全体の Worker 上限を持つ
  モジュール Worker を実行します。
- `createWasmWorkerRuntime` は同一オリジンの WASM アセットを Worker 内で
  読み込みます。
- `createIframeRuntime` は未信頼のマークアップを、デフォルト拒否の CSP、
  ハンドシェイク、セッション検証、明示的なケイパビリティ一覧を持つ
  サンドボックス化された `srcdoc` iframe で実行します。

Worker 側の処理は `@riebeckite/runtime/worker` の `serveWorkerRuntime` または
`serveWasmWorkerRuntime` で実装します。

## SSR とフォールバック

`mount()` の前には何も起動しないため、サーバーでの描画は安全です。静的な
フォールバックを描画し、クライアントで拡張します。

```html
<div data-runtime-fallback-root>
  <p data-runtime-loading hidden>Loading…</p>
  <p data-runtime-fallback>Static result</p>
  <p data-runtime-error role="alert" hidden></p>
</div>
```

`@riebeckite/runtime/client` の `createRuntimeFallback(root)` は、これらの要素を
読み込み中・準備完了・エラーの状態に切り替え、`aria-busy` を維持します。
JavaScript がない場合はフォールバックが表示されたままになります。DOM が
ない場合は例外を投げるため、クライアント初期化処理からのみ呼び出してください。

## セキュリティ

- Worker と WASM はセキュリティサンドボックスではありません。隔離は実行種別
  ではなく、オリジンと CSP のポリシーによって決まります。
- iframe アダプタは `allow-scripts` を必須とし、`allow-same-origin` と未知の
  サンドボックストークンを拒否します。メッセージは送信元、オリジン、プロト
  コル、セッション、スキーマを検証してから受理します。
- ペイロードサイズと同時実行数の上限を超えた要求は拒否します。

## 制限

UI フレームワーク、スケジューラ、サーバーサイドレンダリングの自動化は提供
しません。ページやアプリケーションのライフサイクルから `dispose()` を呼ぶ
必要があり、WASM アセットは互換性のある Content-Type と CSP で配信する必要が
あります。
