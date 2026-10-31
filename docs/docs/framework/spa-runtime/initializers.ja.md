---
date: 2026-10-23
title: 初期化処理
sidebar:
  label: 初期化処理
  order: 30
---
# 初期化処理

## ページ初期化処理の接続

ページを置き換えた後は、新しいページのislandをhydrateし、ページ単位の初期化処理を実行する必要があります。HonoXとの連携は、生成されたクライアントモジュールを通じてこの接続を提供します。

### 生成されるクライアントモジュール

HonoX連携は `virtual:riebeckite/client` を提供します。`spa` が有効な場合、生成されたモジュールはランタイムを一度だけ開始します。

```ts
stopSpaNavigation ??= startSpaNavigation({
  ...spaConfig,
  onBeforePageCommit: () => lifecycle.unmount("page"),
  onPageCommit: async ({ root, signal }) => {
    if (signal.aborted) return;
    await createClient();
    if (signal.aborted || !root.isConnected) return;
    mountPageClientInitializers(root);
  },
});
```

`spaConfig` はシリアライズされた設定オブジェクトです。このモジュールは、解決済みの `spa` 値がある場合だけ、`honox/client` の `createClient` と `@riebeckite/spa` の `startSpaNavigation` を読み込みます。

生成されたモジュールは、次の関数を公開します。

- `initRiebeckiteClient()` — アプリケーションとページの初期化処理を実行し、SPAナビゲーションを開始する
- `remountRiebeckitePage(root)` — ページスコープをunmountし、指定したルートにmountし直す
- `disposeRiebeckiteClient()` — SPAナビゲーションを停止し、両方のスコープを破棄する

通常のサイトコードが呼ぶのは `initRiebeckiteClient()` だけです。ほかの関数は、独自の連携処理と破棄のために用意されています。

### 初期化処理のライフサイクル

生成されたモジュールは、Pluginの[[glossary/client-entry|クライアントエントリ]]が持つメタデータに従って初期化処理を実行します。

- `scope: "app"` は `document` に一度だけmountする
- `scope: "page"`（既定）は `main#main-content` にmountし、ページを置き換える前にunmountする
- `initializerArguments` は引数の種類を選ぶ。`config`（既定）、`root`、`context` のいずれか

生成されたコードでは、`ClientLifecycle.mount` を待たずに呼び出します（`void lifecycle.mount(...)`）。そのため、非同期の初期化処理が次のページ移動の開始時点でも実行中の場合があります。初期化処理は `signal` を受け取り、中断されたら停止する必要があります。

同じ名前の初期化処理を同じスコープにmountした場合、ルートが同じなら既存のmountを再利用します。ルートが違う場合は、ライフサイクルが例外を投げます。

`ClientLifecycle.unmount` は、先にスコープを中断してから、クリーンアップの完了を待ちます。クリーンアップで起きたエラーは報告されますが、ほかの初期化処理の終了を妨げません。

生成された `onPageCommit` は、`createClient()` の完了後に、ページ移動が中断されていないことと、対象のページがまだdocumentに接続されていることを再確認してから、ページの初期化処理を実行します。これにより、hydrationに時間がかかった場合でも、古いページの初期化処理を現在のページに対して実行してしまうことを防ぎます。

`initializerArguments: "context"` を指定したクライアントエントリは、`{ root, config, signal, scope }` を受け取ります。`scope` は、イベントリスナー、タイムアウト、インターバル、独自のクリーンアップを管理します。グローバル環境を書き換えたり、初期化処理の外で作られたリソースを推測したりはしません。必要なリソースを明示的に登録する仕組みです。

## ビルド結果への影響

SPAランタイムが変えるのはクライアントバンドルであり、サーバー側の[[glossary/renderer|レンダラー]]や[[glossary/ssg|SSG]]の出力ではありません。

- `spa` を省略するか `false` にした場合、仮想モジュールは `@riebeckite/spa` も `honox/client` も読み込みません。ランタイムはバンドルに含まれません。
- `spa` を有効にした場合、Viteはランタイムを含め、生成されたクライアントモジュールに `createClient` の読み込みとSPAナビゲーションの開始処理を追加します。
- サーバービルドと静的出力の計画は変わりません。どちらの場合も同じHTMLを描画します。

外部のfixtureで測定した結果（2026-10-21）では、SPAを有効にすると、重複を除いたJavaScriptアセットがrawで5,570 B、gzipで1,715 B、brotliで1,472 B増えました。同じローカルのno-store fixtureでは、初回読み込みの中央値は実質的に変わらず、hoverによる先読みは、先読みなしのSPAナビゲーションの中央値を短縮しました。これらの数値は、そのfixtureに固有のものです。

## 検証範囲

現在、自動テストで確認している範囲は次のとおりです。

- `packages/spa/test/spa.test.ts` の設定値の検証と、`packages/spa/test/prefetch.test.ts` のキャッシュの有効期限（TTL）、重複排除、LRUによる削除、呼び出し元ごとの中断の分離
- `packages/integrations/honox/test/client_module.test.ts` の生成されたimport文、`app`・`page`・`context` 引数、SPAの有効・無効の接続
- `tests/spa-runtime/browser.test.ts` のブラウザ上でのページ移動の競合、headの所有権、履歴、ハッシュへのフォーカス、フォールバック、リダイレクト、先読み済みページの再利用

このリポジトリのブラウザテストでは、次の範囲を網羅していません。

- クリック判定の境界的なケース
- `popstate` 時のスクロール位置の復元
- 実際のPlugin初期化処理でのクリーンアップ失敗

これらの領域を変更するときは、対象を絞ったテストか手動での確認が必要です。テストがないことは、動作が完成している証拠ではありません。
