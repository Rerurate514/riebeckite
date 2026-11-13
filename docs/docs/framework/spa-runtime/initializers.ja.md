---
date: 2026-10-23
title: 初期化処理
sidebar:
  label: 初期化処理
  order: 30
---
# 初期化処理

## ページ初期化処理の接続

ページを置き換えた後は、新しいページの island を hydrate し、ページ単位の初期化処理を実行する必要があります。HonoX との連携は、生成されたクライアントモジュールを通じてこの接続を提供します。

### 生成されるクライアントモジュール

HonoX 連携は `virtual:riebeckite/client` を提供します。`spa` が有効な場合、生成されたモジュールはランタイムを一度だけ開始します。

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

- `initRiebeckiteClient()` — アプリケーションとページの初期化処理を実行し、SPA ナビゲーションを開始する
- `remountRiebeckitePage(root)` — ページスコープを unmount し、指定したルートに mount し直す
- `disposeRiebeckiteClient()` — SPA ナビゲーションを停止し、両方のスコープを破棄する

通常のサイトコードが呼ぶのは `initRiebeckiteClient()` だけです。ほかの関数は、独自の連携処理と破棄のために用意されています。

### 初期化処理のライフサイクル

生成されたモジュールは、Plugin の[[glossary/client-entry|クライアントエントリ]]が持つメタデータに従って初期化処理を実行します。

- `scope: "app"` は `document` に一度だけ mount する。selector を指定した app スコープのエントリは、ページコミットのたびに再評価されるため、SPA ナビゲーションで後から追加されたマーカーでも読み込まれる
- `scope: "page"`（既定）は `main#main-content` に mount し、ページを置き換える前に unmount する。マーカーがページルートの外にあるシェル領域にある場合は、`root: "document"` を指定する
- `presenceSelector` は現在の document 全体に対して評価する。読み込み条件だけを決め、初期化処理は対象要素を自分で探す
- `initializerArguments` は引数の種類を選ぶ。`config`（既定）、`root`、`context` のいずれか

生成されたコードでは、`ClientLifecycle.mount` を待たずに呼び出します（`void lifecycle.mount(...)`）。そのため、非同期の初期化処理が次のページ移動の開始時点でも実行中の場合があります。初期化処理は `signal` を受け取り、中断されたら停止する必要があります。

同じ名前の初期化処理を同じスコープに mount した場合、ルートが同じなら既存の mount を再利用します。ルートが違う場合は、ライフサイクルが例外を投げます。

`ClientLifecycle.unmount` は、先にスコープを中断してから、クリーンアップの完了を待ちます。クリーンアップで起きたエラーは報告されますが、ほかの初期化処理の終了を妨げません。

生成された `onPageCommit` は、`createClient()` の完了後に、ページ移動が中断されていないことと、対象のページがまだ document に接続されていることを再確認してから、ページの初期化処理を実行します。これにより、hydration に時間がかかった場合でも、古いページの初期化処理を現在のページに対して実行してしまうことを防ぎます。

`initializerArguments: "context"` を指定したクライアントエントリは、`{ root, marker, config, signal, scope }` を受け取ります。`marker` は `presenceSelector` に一致した要素です。ページスコープのルートは既定で現在のページコンテナです。マーカーがシェル領域にある場合は `root: "document"` を指定してください。開発時は、ページスコープのマーカーがページルートの外にある場合に一度だけ警告します。`scope` は、イベントリスナー、タイムアウト、インターバル、独自のクリーンアップを管理します。グローバル環境を書き換えたり、初期化処理の外で作られたリソースを推測したりはしません。必要なリソースを明示的に登録する仕組みです。

## ビルド結果への影響

SPA ランタイムが変えるのはクライアントバンドルであり、サーバー側の[[glossary/renderer|レンダラー]]や[[glossary/ssg|SSG]]の出力ではありません。

- `spa` を省略するか `false` にした場合、仮想モジュールは `@riebeckite/spa` も `honox/client` も読み込みません。ランタイムはバンドルに含まれません。
- `spa` を有効にした場合、Vite はランタイムを含め、生成されたクライアントモジュールに `createClient` の読み込みと SPA ナビゲーションの開始処理を追加します。
- サーバービルドと静的出力の計画は変わりません。どちらの場合も同じ HTML を描画します。

外部の fixture で測定した結果（2026-10-21）では、SPA を有効にすると、重複を除いた JavaScript アセットが raw で5,570 B、gzip で1,715 B、brotli で1,472 B 増えました。同じローカルの no-store fixture では、初回読み込みの中央値は実質的に変わらず、hover による先読みは、先読みなしの SPA ナビゲーションの中央値を短縮しました。これらの数値は、その fixture に固有のものです。

## 検証範囲

現在、自動テストで確認している範囲は次のとおりです。

- `packages/spa/test/spa.test.ts` の設定値の検証と、`packages/spa/test/prefetch.test.ts` のキャッシュの有効期限（TTL）、重複排除、LRU による削除、呼び出し元ごとの中断の分離
- `packages/integrations/honox/test/client_module.test.ts` の生成された import 文、`app` ・ `page` ・ `context` 引数、SPA の有効・無効の接続
- `tests/spa-runtime/browser.test.ts` のブラウザ上でのページ移動の競合、head の所有権、履歴、ハッシュへのフォーカス、フォールバック、リダイレクト、先読み済みページの再利用

このリポジトリのブラウザテストでは、次の範囲を網羅していません。

- クリック判定の境界的なケース
- `popstate` 時のスクロール位置の復元
- 実際の Plugin 初期化処理でのクリーンアップ失敗

これらの領域を変更するときは、対象を絞ったテストか手動での確認が必要です。テストがないことは、動作が完成している証拠ではありません。
