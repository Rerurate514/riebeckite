---
date: 2026-11-01
title: Interactive Runtime
---

# Interactive Runtime

Interactive Runtime は、メインスレッド、Web Worker、WebAssembly Worker、
サンドボックス化された iframe で動くブラウザー処理に、共通のライフサイクルと
呼び出し契約を与えます。コア契約は `@riebeckite/runtime`、ブラウザー向け
アダプタは `@riebeckite/runtime/client`、Worker 側のホスト処理は
`@riebeckite/runtime/worker` にあります。

Runtime は任意機能です。Runtime をマウントしないページは、アダプタ、Worker、
WASM アセット、iframe ブリッジをダウンロードしません。

## アーキテクチャ

```text
Plugin client entry
        │
        ▼
ClientLifecycle (page or app scope)
        │  mount / unmount
        ▼
ClientRuntimeHost ── InteractiveRuntimeRegistry
        │
        ▼
InteractiveRuntime instance (state, signal, limits, errors)
        │
        ├── main adapter      → 信頼済みの DOM コード
        ├── worker adapter    → モジュール Worker + 型付きプロトコル
        ├── wasm adapter      → Worker + WebAssembly モジュール
        └── iframe adapter    → サンドボックス化された srcdoc ゲスト
```

`@riebeckite/runtime` は HonoX、Vite、ブラウザーグローバルを import しません。
HonoX 連携はページに Plugin のマーカーがある場合だけクライアントエントリを
読み込み、Plugin は `runtimeEntries` で Runtime モジュールを宣言します。

## ライフサイクル

インスタンスは `created`、`starting`、`ready`、`running`、`stopping`、
`disposed`、`failed` と遷移します。

- `mount()` はドライバーを起動します。起動中の再呼び出しは同じ Promise を
  返し、準備完了後の呼び出しは即座に解決します。
- `invoke()` は `ready` または `running` でのみ、同時実行数の上限まで受け付け
  ます。
- `dispose()` は冪等で、進行中の処理を中断し、`stop()` を待ちます。
- インスタンスのシグナルを中断すると破棄されます。
- 起動失敗または致命的な Runtime 失敗は終端です。失敗したインスタンスは
  再利用せず、新しいインスタンスを生成します。
- 通常の呼び出しエラーではインスタンスを再利用できます。

インスタンスの所有権はページまたはアプリケーションスコープにあります。
HonoX のページは `ClientInitializerContext.runtimes` に
`ClientRuntimeHost` を渡します。ページのアンマウント時にホストが生成した
すべてのインスタンスを破棄します。アプリケーションスコープの Runtime は
アプリケーションのライフサイクルが所有します。

## コア API

```ts
import {
  defineInteractiveRuntime,
  InteractiveRuntimeRegistry,
} from "@riebeckite/runtime";

const double = defineInteractiveRuntime<{ value: number }, number>({
  id: "double",
  kind: "main",
  capabilities: ["dom"],
  create: () => ({
    start: () => {},
    invoke: (input) => input.value * 2,
    stop: () => {},
  }),
});

const registry = new InteractiveRuntimeRegistry();
registry.register(double);

const instance = registry.create<{ value: number }, number>("double");
await instance.mount();
const result = await instance.invoke({ value: 21 });
await instance.dispose();
```

定義は `id`、`kind`、`capabilities`、任意の `limits`、`create(context)` を
持ちます。ファクトリは `instanceId`、`signal`、解決済みの `limits`、ホストが
渡す不透明な `root` を受け取ります。空の ID や重複した ID、重複した
capability は拒否されます。`createInteractiveRuntime(definition, options)` は
レジストリを介さずにインスタンスを作り、`registry.create(id, options)` は
ID を解決してから同じように作ります。

上限の既定値は入力 4 MiB、出力 16 MiB、同時呼び出し 16、呼び出しタイムアウト
なし、起動タイムアウト 15 秒です。アダプタはより厳しいタイムアウトを設定
できます。Worker アダプタの呼び出しタイムアウトは既定で 30 秒、iframe
アダプタは 10 秒です。

`invoke(input, options)` は任意の `signal`、`timeoutMs`、`capability`、
`transfer` リストを受け取ります。`timeoutMs` はその呼び出しだけインスタンスの
上限を上書きします。`capability` は、Runtime がその capability を宣言して
いなければ呼び出しを拒否します。`onStateChange(listener)` は解除関数を返します。
インスタンスは `id`、`instanceId`、`kind`、`capabilities`、`state`、`signal` を
公開します。

## メインスレッドアダプタ

`createMainRuntime({ id, capabilities, start, invoke, stop })` は信頼済みの
ファーストパーティコードを DOM ルートに対して実行します。小さな公式
ウィジェットに適しています。未信頼コードの隔離境界ではありません。

Calculator Plugin が参照実装です。クライアントエントリがコードブロックごとに
1 つの Runtime を生成してブロック内に描画し、サーバー側の結果を
JavaScript なしのフォールバックとして残します。

## Worker アダプタ

`createWorkerRuntime` はインスタンスごとに 1 つのモジュール Worker を生成し、
リクエスト ID 付きの型付きプロトコルで通信します。同時リクエスト、
Transferable の入出力、キャンセル、タイムアウト、クラッシュ検出、終了を
扱います。

```ts
import { createWorkerRuntime } from "@riebeckite/runtime/client";

const runtime = createWorkerRuntime<{ value: number }, number>({
  id: "double-worker",
  createWorker: () =>
    new Worker(new URL("./double.worker.js", import.meta.url), {
      type: "module",
    }),
});
```

Worker エントリでは `serveWorkerRuntime(self, { invoke })` を使います。1 つの
ドキュメントで同時に起動できる Worker Runtime は 8 個までです。終了した
インスタンスの保留中 Promise は `RuntimeAbortError` で拒否され、未解決のまま
残りません。

Worker は自動的にネットワークアクセスを失うわけではありません。Worker が
到達できる範囲は Origin、CORS、Content Security Policy で決まります。

## WASM Worker アダプタ

`createWasmWorkerRuntime({ wasmUrl, exportName, createWorker })` は、
`serveWasmWorkerRuntime(self)` を使う Worker 内で同一オリジンの WASM アセットを
読み込みます。レスポンスが `application/wasm` の場合はストリーミング
コンパイルを使い、Content-Type がないサーバーには `ArrayBuffer` の
フォールバックを使います。

WASM の読み込み失敗、エクスポート不足、トラップは `RuntimeWasmError` に
なります。`RuntimeWasmError.trap` でトラップと初期化失敗を区別できます。
WebAssembly は未信頼コードのセキュリティサンドボックスではありません。

## サンドボックス化 iframe アダプタ

`createIframeRuntime({ html, title, sandbox, expectedOrigin, capabilities })`
は `srcdoc` iframe 内でマークアップを実行します。既定の sandbox は
`allow-scripts` のみです。アダプタは `allow-same-origin` と未知の sandbox
トークンを拒否し、インラインスクリプトとスタイルだけを許可してネットワーク、
フォーム、トップナビゲーションを禁止するデフォルト拒否の CSP を適用します。

メッセージは送信元ウィンドウ、Origin、プロトコルバージョン、セッション ID、
メッセージ種別、リクエスト ID が稼働中のインスタンスと一致する場合だけ受理
します。不正なメッセージや外部からのメッセージは無視します。ハンドシェイク
後のナビゲーションはインスタンスを失敗にします。1 つのドキュメントで同時に
起動できる iframe Runtime は 4 個までです。

不透明なサンドボックスコンテンツの期待 Origin は `"null"` です。同一
オリジンの未信頼コンテンツに `allow-scripts` と `allow-same-origin` を併用
しないでください。`"null"` は有効な `targetOrigin` ではないため、親は不透明な
ゲストへ `"*"` で送信しますが、受理時には送信元ウィンドウとセッションの検証が
引き続き必須です。

## Plugin 連携

Plugin はクライアントエントリで Runtime モジュールを宣言します。

```ts
import { createClientEntry, createRuntimeEntry } from "@riebeckite/core";

createClientEntry(
  "example",
  "@riebeckite/plugin-example/client",
  "initExample",
  undefined,
  "page",
  "context",
  "[data-example]",
  [
    createRuntimeEntry(
      "example",
      "@riebeckite/plugin-example/client-runtime",
      "createExampleRuntime",
    ),
  ],
);
```

HonoX のクライアントモジュールは静的な `import()` 式で Runtime モジュールを
遅延読み込みし、定義を登録して、`context.runtimes` にホストを渡します。
クライアントエントリ自体も、ページが `presenceSelector` に一致する場合だけ
読み込まれます。無効な Plugin はクライアントコードを出力しません。

Runtime モジュールは、JSON の `options` として明示的に宣言しない限り、
ビルド時の Plugin オプションを受け取りません。Plugin のオプションが
クライアントバンドルへ自動的にコピーされることはありません。作成手順は
[[plugin-system|プラグインシステム]]と
[プラグインを書く](../plugins/writing-a-plugin.ja.md)を参照してください。

## SSR と SSG

`mount()` の前に Worker、WASM モジュール、iframe は起動せず、`mount()` は
クライアント初期化処理からしか呼ばれません。そのためサーバー描画中に
Runtime が起動することはありません。

静的なフォールバックを描画し、クライアントで拡張します。

```html
<div data-runtime-fallback-root>
  <p data-runtime-loading hidden>Loading…</p>
  <p data-runtime-fallback>Static result</p>
  <p data-runtime-error role="alert" hidden></p>
</div>
```

`createRuntimeFallback(root)` はこれらの要素を読み込み中、準備完了、エラーの
状態に切り替え、`aria-busy` を維持します。DOM がない場合は例外を投げるため、
クライアント初期化処理からのみ呼び出してください。JavaScript がない場合は
フォールバックが表示されたままになります。

Runtime は公開コンテンツビューを変更しません。クライアントエントリには
Plugin の識別子と明示的に公開した設定だけが含まれるため、Draft と Scheduled
のコンテンツがクライアントバンドルへ入ることはありません。

## SPA ナビゲーション

Runtime は既存の `ClientLifecycle` と SPA トランザクションを使います。ページの
コミット前にページスコープがアンマウントされ、Worker、WASM、iframe、
メインスレッド、タイマー、イベントリスナーのリソースが解放されます。
コミット後は新しいページの初期化処理が新しい DOM に対してインスタンスを
生成します。

ページへ戻ると新しいインスタンスが生成されます。前のページのインスタンスが
ナビゲーション境界を越えて再利用されることはありません。

## ブラウザー対応

- Worker アダプタと WASM アダプタにはモジュール Worker が必要です。
- WASM アダプタには WebAssembly が必要です。未対応ブラウザーでは
  `RuntimeUnsupportedError` になります。
- iframe アダプタには `srcdoc`、サンドボックス化 iframe、`postMessage` が
  必要です。
- メインスレッドアダプタには DOM が必要です。

すべてのブラウザーがすべてのアダプタをサポートすると仮定せず、利用できない
Capability にはフォールバックを表示してください。

## パフォーマンス

Windows の Chrome headless shell 155 で、リポジトリのブラウザーフィクスチャと
本番ドキュメントビルドを計測した結果です。

| 計測項目 | 結果 |
| --- | --- |
| メインスレッドのマウント | 1 ms 未満 |
| Worker の起動 | 10 ms 未満 |
| Worker の往復（30 リクエスト） | 平均 1 ms 未満 |
| WASM の起動 | 10 ms 未満 |
| iframe の起動 | 5 ms 未満 |
| Runtime の破棄 | 1 ms 未満 |
| Calculator を再マウントする SPA ナビゲーション | 100 ms 未満 |
| 30 回のマウント・破棄後のヒープ増加 | 約 18 KB |
| メインクライアントバンドル | 108 KB（gzip 35 KB） |
| 遅延読み込みする Calculator Runtime チャンク | 3 KB（gzip 1.2 KB） |

数値は環境に依存します。バンドルサイズと起動時間は Runtime の性能テストで
確認し、Worker と iframe の予算は単体テストとブラウザーテストで検証します。

## エラー処理

```ts
import {
  RuntimeAbortError,
  RuntimeConcurrencyError,
  RuntimeFailureError,
  RuntimeIframeError,
  RuntimePayloadError,
  RuntimeStateError,
  RuntimeTimeoutError,
  RuntimeUnsupportedError,
  RuntimeWasmError,
  RuntimeWorkerError,
} from "@riebeckite/runtime";
```

| エラー | 発生条件 |
| --- | --- |
| `RuntimeStateError` | 不正な状態遷移、重複登録、未登録の Runtime |
| `RuntimeFailureError` | 終端となる起動失敗または実行時失敗 |
| `RuntimeAbortError` | インスタンスまたは呼び出しのシグナル中断 |
| `RuntimeTimeoutError` | 起動または呼び出しがタイムアウトした |
| `RuntimePayloadError` | 入力または出力がバイト上限を超えた |
| `RuntimeConcurrencyError` | 同時呼び出しが `maxConcurrent` を超えた |
| `RuntimeWorkerError` | Worker のクラッシュ、プロトコル違反、リモート失敗 |
| `RuntimeWasmError` | WASM の読み込み失敗、エクスポート欠損、トラップ（`trap` が true） |
| `RuntimeIframeError` | サンドボックス検証、ハンドシェイク、遷移、リモート失敗 |
| `RuntimeUnsupportedError` | ブラウザーに必要な機能がない |

通常の呼び出しエラーではインスタンスを再利用できます。起動失敗または致命的な
Runtime 失敗は終端なので、新しいインスタンスを作ります。終了中のインスタンスは
保留中の呼び出しを放置せず拒否します。`RuntimeInstanceOptions` の `onError` は
エラーとフェーズ（`start`、`invoke`、`stop`、`state-change`）を受け取ります。

## セキュリティモデル

- メインスレッドアダプタは信頼済みのファーストパーティコードをページ内で実行
  します。隔離境界ではありません。
- Worker が隔離するのはグローバルスコープであり、ネットワークではありません。
  Origin、CORS、CSP が Worker の取得先を決めます。
- WebAssembly はサンドボックスではありません。WASM アダプタは Worker 内で
  実行しますが、モジュールコードは信頼します。
- 未信頼のマークアップに使えるのは iframe アダプタだけです。`allow-scripts` と
  `allow-forms` だけを受け付け、`allow-same-origin` と未知のトークンを拒否し、
  ネットワーク、フォーム、トップナビゲーションを許可しない既定の CSP を適用します。
- iframe のメッセージは、送信元ウィンドウ、Origin、プロトコルバージョン、
  セッション ID、メッセージ種別、リクエスト ID が一致しなければ受け付けません。
  ハンドシェイク後の遷移はインスタンスを失敗させます。
- Runtime コードは、JSON の `options` として明示しない限りビルド時のプラグイン
  オプションを受け取りません。下書きや予約コンテンツはクライアントバンドルへ
  入りません。
- ホストによる終了が最終的な扱いです。ゲストのクリーンアップハンドラーは、終了
  前に破棄メッセージが処理された場合だけ実行されます。

## 制限

- Runtime は任意のスクリプト向けの汎用サンドボックスではありません。未信頼
  コンテンツには iframe アダプタと適切な Origin / CSP ポリシーを使ってください。
- スケジューラ、優先度キュー、自動 CPU 配分はありません。
- Worker と iframe の同時実行上限はタブ単位ではなくドキュメント単位です。
- WASM アダプタは Runtime インスタンスごとに 1 つのエクスポート関数を想定します。
- Calculator の例は算術のみを評価します。JavaScript の評価器ではありません。
- ホストによる終了が最終的な扱いです。ゲストの `dispose` ハンドラーは、終了
  前に破棄メッセージが処理された場合だけ実行されます。
- 進行中のリクエストがない Worker クラッシュは、次回の呼び出し時に表面化します。
- ブラウザー E2E はローカルにインストールされた Chrome または Chromium に
  依存します。

## トラブルシューティング

- **何もマウントされない**: プラグインのクライアントエントリは、ページが
  `presenceSelector` に一致した場合だけ読み込まれ、`mount()` はクライアント
  イニシャライザーからしか呼ばれません。マーカーとイニシャライザーを確認して
  ください。
- **Worker が最初の結果を返す前に失敗する**: モジュール Worker が必要です。
  Worker の URL が同一 Origin で、JavaScript の MIME タイプで配信されていることを
  確認してください。
- **`RuntimeUnsupportedError`**: ブラウザーにモジュール Worker、WebAssembly、
  `srcdoc` のいずれかがありません。再試行せず、静的フォールバックを表示して
  ください。
- **iframe の要求が無視される**: Origin、セッション、プロトコルバージョン、
  送信元ウィンドウのいずれかが一致しないためです。`expectedOrigin` を確認して
  ください。不透明なサンドボックスコンテンツでは `"null"` を使います。
- **iframe の遷移でインスタンスが失敗する**: ゲストがハンドシェイク後に遷移して
  います。ゲスト文書を安定させるか、新しいインスタンスを作ってください。
- **承認情報やコンテンツがクライアントバンドルへ漏れる**: Runtime モジュールが
  受け取るのは明示的に宣言した JSON の `options` だけです。クライアント
  エントリとプラグイン設定を確認してください。
- **Worker のクラッシュが次の呼び出しまで分からない**: 進行中の要求がない
  クラッシュは次回の呼び出しで表面化します。`onError` を登録し、フォールバックを
  表示してください。

## 例

- [Calculator Plugin](../plugins/calculator.ja.md) — メインスレッドアダプタ、
  静的フォールバック、Runtime の遅延読み込み、SPA での後始末を使う公式 Plugin。
- [SPA ランタイムの内部実装](./spa-runtime.ja.md) — ナビゲーション
  トランザクションとライフサイクルの制約。
- [HonoX Integration](./honox-integration.ja.md) — クライアントモジュール生成と
  アプリケーション境界。
