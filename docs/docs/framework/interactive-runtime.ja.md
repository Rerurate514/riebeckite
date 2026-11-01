---
date: 2026-11-01
title: Interactive Runtime
---

# Interactive Runtime

Interactive Runtime は、静的サイトとして配信される Riebeckite サイトでブラウザー上の
コードを動かすための、Plugin 開発者向けの基盤です。メインスレッド、Web Worker、
WebAssembly Worker、サンドボックス化された iframe のどこで処理が動いても、Plugin には
mount、invoke、dispose という共通のライフサイクルを提供します。

これは**サイト訪問者が有効化する機能ではありません**。Markdown を書くだけで
インタラクティブになる機能でもありません。Markdown に JavaScript を書いても実行され
ません。Plugin がクライアントエントリと Runtime 定義を提供し、ページに Plugin の
マーカーがある場合だけ Runtime が読み込まれます。Runtime が提供するのは実行契約であり、
ウィジェット、入力、描画は Plugin が実装します。

静的 HTML にはオンデマンドで計算するサーバーがありません。ブラウザー処理を Plugin ごとに
個別実装すると、Worker の解放漏れ、SPA ナビゲーションの破綻、サイズ上限やタイムアウトの
ばらつき、未信頼マークアップの危険な扱いが発生します。Runtime はその部分を共通化し、
Plugin 開発者がウィジェットに集中できるようにします。

## できること

Plugin 開発者は実行環境を選びます。Runtime がライフサイクル、上限、エラー、
フォールバックのフック、後始末を提供し、Plugin がコードと UI を提供します。

| 用途 | アダプタ | Plugin が実装するもの |
| --- | --- | --- |
| 小さな公式ウィジェット、信頼済みの DOM コード | メインスレッド | DOM ルートに対する `start`、`invoke`、`stop` |
| メインスレッドを塞がない重い計算 | Worker | モジュール Worker とリクエストハンドラー |
| コンパイル済み・移植済みのコード | WASM Worker | 同一オリジンの `.wasm` と 1 つのエクスポート関数 |
| 未信頼のマークアップや第三者のデモ | サンドボックス iframe | ゲスト HTML とメッセージ処理 |

Runtime がウィジェットを自動生成することはありません。計算機、グラフ、エディタ、
データ探索は、Runtime の上に作られる Plugin です。このリポジトリに同梱されている
Runtime の利用例は [Calculator Plugin](../plugins/calculator.ja.md) だけです。

## 動作するデモ

このページでは、実際の Calculator Plugin が Interactive Runtime を通じて動いています。
サーバーが先に値を描画し、ブラウザーが Runtime をマウントして同じ式を再評価します。

```calc
2 * (3 + 4)
```

結果は JavaScript の有無にかかわらず `14` です。違いは値の出どころです。静的 HTML には
サーバーの結果が入っており、Runtime のマウント後にライブの結果へ置き換わります。
Runtime が失敗した場合は、静的な値が表示されたままになります。

このデモは限界も正直に示しています。**入力に応じて結果が変わる計算機ではありません。**
式はビルド時に固定され、Plugin に入力処理はありません。入力駆動のデモには新しい
ファーストパーティ Plugin が必要で、それはこのドキュメント変更の範囲外です。このデモが
示すのは、実際のライフサイクルとフォールバックの契約であり、新しい実行基盤ではありません。

`calc` ブロックは、Calculator Plugin の remark 処理によってビルド時に変換されます。
任意の JavaScript ではありません。Plugin のパーサーは数値、`+`、`-`、`*`、`/`、
単項符号、括弧、空白だけを受け付け、`eval` や `new Function` は使いません。

## Plugin 開発者向けクイックスタート

Runtime 定義は、ID、種類、Capability、ファクトリを持つプレーンなオブジェクトです。
次の例はメインスレッドで動きます。

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

実際の Plugin はクライアントエントリで Runtime モジュールを宣言します。

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

パッケージ全体の雛形は [[plugin-system|プラグインシステム]]と
[プラグインを書く](../plugins/writing-a-plugin.ja.md)を参照してください。

## 仕組み

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

Runtime は任意機能です。Runtime をマウントしないページは、アダプタ、Worker、
WASM アセット、iframe ブリッジをダウンロードしません。

### ライフサイクル

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

### コア API

定義は `id`、`kind`、`capabilities`、任意の `limits`、`create(context)` を
持ちます。ファクトリは `instanceId`、`signal`、解決済みの `limits`、ホストが
渡す不透明な `root` を受け取ります。空の ID や重複した ID、重複した
Capability は拒否されます。`createInteractiveRuntime(definition, options)` は
レジストリを介さずにインスタンスを作り、`registry.create(id, options)` は
ID を解決してから同じように作ります。

上限の既定値は入力 4 MiB、出力 16 MiB、同時呼び出し 16、呼び出しタイムアウト
なし、起動タイムアウト 15 秒です。アダプタはより厳しいタイムアウトを設定
できます。Worker アダプタの呼び出しタイムアウトは既定で 30 秒、iframe
アダプタは 10 秒です。

`invoke(input, options)` は任意の `signal`、`timeoutMs`、`capability`、
`transfer` リストを受け取ります。`timeoutMs` はその呼び出しだけインスタンスの
上限を上書きします。`capability` は、Runtime がその Capability を宣言して
いなければ呼び出しを拒否します。`onStateChange(listener)` は解除関数を返します。
インスタンスは `id`、`instanceId`、`kind`、`capabilities`、`state`、`signal` を
公開します。

## 他の機能との関係

- [[plugin-system|プラグインシステム]]がクライアントエントリ、presence
  セレクター、Runtime エントリの宣言を担当します。Runtime は Plugin の一部であり、
  独立したアプリではありません。
- [Calculator](../plugins/calculator.ja.md) は参照実装です。メインスレッド
  アダプタ、静的フォールバック、Runtime の遅延読み込み、SPA での後始末を使います。
- [[spa-runtime|SPA ランタイムの内部実装]]は、ページスコープのインスタンスを
  破棄するナビゲーションのトランザクションを説明します。
- [[honox-integration|HonoX Integration]] はクライアントモジュール生成と
  アプリケーション境界を説明します。
- Markdown は実行面ではありません。`calc` のようなフェンス付きブロックが
  インタラクティブになるのは、Plugin のビルド時変換が Plugin のマークアップを
  出力し、その Plugin がクライアントエントリを同梱している場合だけです。
  Runtime が Markdown からスクリプトを探すことはありません。

## 制限事項

- Runtime は任意のスクリプト向けの汎用サンドボックスではありません。未信頼
  コンテンツには iframe アダプタと適切な Origin / CSP ポリシーを使ってください。
- 提供するのは実行の土台であり、ウィジェットではありません。UI、入力、結果の描画は
  各 Plugin が実装します。
- スケジューラ、優先度キュー、自動 CPU 配分はありません。
- Worker と iframe の同時実行上限はタブ単位ではなくドキュメント単位です。
- WASM アダプタは Runtime インスタンスごとに 1 つのエクスポート関数を想定します。
- Calculator の例は算術のみを評価します。JavaScript の評価器ではありません。
- ホストによる終了が最終的な扱いです。ゲストの `dispose` ハンドラーは、終了
  前に破棄メッセージが処理された場合だけ実行されます。
- 進行中のリクエストがない Worker クラッシュは、次回の呼び出し時に表面化します。
- ブラウザー E2E はローカルにインストールされた Chrome または Chromium に
  依存します。

## アダプタ

### メインスレッドアダプタ

`createMainRuntime({ id, capabilities, start, invoke, stop })` は信頼済みの
ファーストパーティコードを DOM ルートに対して実行します。小さな公式
ウィジェットに適しています。未信頼コードの隔離境界ではありません。

Calculator Plugin が参照実装です。クライアントエントリがコードブロックごとに
1 つの Runtime を生成してブロック内に描画し、サーバー側の結果を
JavaScript なしのフォールバックとして残します。

### Worker アダプタ

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

### WASM Worker アダプタ

`createWasmWorkerRuntime({ wasmUrl, exportName, createWorker })` は、
`serveWasmWorkerRuntime(self)` を使う Worker 内で同一オリジンの WASM アセットを
読み込みます。レスポンスが `application/wasm` の場合はストリーミング
コンパイルを使い、Content-Type がないサーバーには `ArrayBuffer` の
フォールバックを使います。

WASM の読み込み失敗、エクスポート不足、トラップは `RuntimeWasmError` に
なります。`RuntimeWasmError.trap` でトラップと初期化失敗を区別できます。
WebAssembly は未信頼コードのセキュリティサンドボックスではありません。

### サンドボックス化 iframe アダプタ

`createIframeRuntime({ html, title, sandbox, expectedOrigin, capabilities })`
は `srcdoc` iframe 内でマークアップを実行します。既定の sandbox は
`allow-scripts` のみです。アダプタは `allow-scripts` と `allow-forms` を受け付け、
`allow-same-origin` と未知の sandbox トークンを拒否し、インラインスクリプトと
スタイルだけを許可してネットワーク、フォーム、トップナビゲーションを禁止する
デフォルト拒否の CSP を適用します。

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
