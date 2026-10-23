# @riebeckite/spa

RiebeckiteのサイトでSPAナビゲーションを有効にするための、任意のブラウザランタイムです。

[English](./README.md)

## インストール

サイトのRiebeckite設定で `spa` を有効にすると、`@riebeckite/honox` がこのパッケージを読み込みます。HonoXとの連携を使うアプリケーションでは、直接importする必要はありません。

```sh
pnpm add @riebeckite/spa
```

## 使い方

`riebeckite.config.ts` でSPAナビゲーションを有効にします。

```ts
import { defineConfig } from "@riebeckite/core";

export default defineConfig({
  spa: true,
});
```

`spa: false` を指定するか `spa` を省略すると、SPAナビゲーションを無効にできます。設定を変える場合は、`true` の代わりにオプションオブジェクトを渡します。

```ts
export default defineConfig({
  spa: { prefetch: "hover", viewTransitions: true },
});
```

サーバー側のレンダラーは、ページごとに1つの `<main id="main-content" tabindex="-1">` を出力する必要があります。ランタイムは、同一オリジンへのGETリクエストが成功した後にこのルートを置き換えます。アプリケーションシェルはそのまま残し、ページ固有のheadメタデータを更新し、履歴とスクロール位置を復元し、ページのルートへフォーカスを移して、支援技術に新しいページを通知します。

修飾キーを押したリンク、別の `target` を持つリンク、`download` を指定したリンク、`data-spa="false"` を指定したリンクは、通常のブラウザ動作を維持します。ページ移動に失敗した場合は、ページ全体の読み込みにフォールバックします。

## head要素の所有権

ページ固有のhead要素には `data-riebeckite-head="page"` を指定します。ランタイムはページ移動時にこれらを置き換え、`data-riebeckite-head="global"` と `"runtime"` の要素を残し、所有権のない要素も保持します。`PluginHeadTags` が生成するPluginの `meta` と `link` はページ所有になり、実行可能なスクリプトは複製も再実行もされません。

## 先読み

`prefetch: "hover"` は、成功したページのレスポンスを30秒間再利用し、完了した項目を最近使った順に最大20件保持します。同じURLへの同時リクエストは重複排除されます。ブラウザがデータ節約設定や2G以下の接続を報告している場合は、先読みしません。

## 公開API

- `spa(options)` — RiebeckiteのSPA設定値を作成します。
- `startSpaNavigation(options)` — 独自のブラウザ連携向けにページ移動の処理を開始し、クリーンアップ関数を返します。

有効にする手順は [SPAナビゲーションガイド](../../docs/docs/guides/spa-navigation.ja.md)、実装上の制約は [SPAランタイムの内部実装](../../docs/docs/framework/spa-runtime.ja.md) を参照してください。
