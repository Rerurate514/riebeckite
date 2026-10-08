<!-- Generated from packages/plugins/ux/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# UX

記事の読みやすさを高めるクライアント側のプログレッシブ・エンハンスメントをまとめたプラグインです。ビルド後の記事 HTML はそのままに、読み進捗バー・トップへ戻るボタン・目次のスクロール連動ハイライト・コードのコピーボタンを追加します。

[English](./ux.md)

## できること

- **読み進捗バー**: 画面上部に固定した細いバー（`.rb-ux__progress`）が記事のスクロール量に追従します。
- **トップへ戻るボタン**: 一定量スクロールすると表示される button 要素（`.rb-ux__back-to-top`）。`aria-label` を持ち、スムーズスクロールで先頭へ戻ります。
- **目次のスクロール連動**: 記事の目次コンテナ内の `a[href^="#"]` を `IntersectionObserver` で監視し、現在位置の見出しリンクに `.rb-ux__toc-active` を付けます。
- **コードのコピーボタン**: 各 `pre > code`（`.rb-ux__code` でラップ）にコピーボタン（`.rb-ux__copy`）を追加します。コピー直後は一時的に「コピーしました」表示へ切り替わります。

いずれも対応する DOM が無いページでは何もしません。`initUx()` は何度呼んでも二重に初期化しません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { uxPlugin } from "@riebeckite/plugin-ux";

export default defineConfig({
  // ...
  plugins: [
    uxPlugin({
      progress: true,
      backToTop: true,
      tocScrollSpy: true,
      codeCopy: true,
      backToTopLabel: "トップへ戻る",
      copyLabel: "コピー",
      copiedLabel: "コピーしました",
    }),
  ],
});
```

`uxPlugin` は `ux` という別名でもエクスポートしています。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `progress` | `boolean` | `true` | 読み進捗バーを表示する |
| `backToTop` | `boolean` | `true` | トップへ戻るボタンを表示する |
| `tocScrollSpy` | `boolean` | `true` | 目次のスクロール連動ハイライトを有効にする |
| `codeCopy` | `boolean` | `true` | コードのコピーボタンを追加する |
| `backToTopLabel` | `string` | `"Back to top"` | トップへ戻るボタンの `aria-label` |
| `copyLabel` | `string` | `"Copy"` | コピーボタンのラベル |
| `copiedLabel` | `string` | `"Copied"` | コピー成功時に一時表示するラベル |

## 設定がクライアントへ渡る仕組み

クライアント側の初期化コードは静的にバンドルされ、プラグインのオプションを直接受け取れません。そのためこのプラグインは、ビルド時に各記事 HTML の先頭へ次の不活性な JSON 要素を挿入します。

```html
<script type="application/json" id="rb-ux-config" data-rb-ux-config>{...}</script>
```

`initUx()` はこの要素を読み取って設定を復元します。要素が無い場合は全機能が有効な既定値で動作します。挿入は `onPostProcessed` で行い、`onManifestCreated` でも未挿入の記事エントリへ反映します。挿入はページごとに一度だけで、`data-rb-ux-config` を目印に重複挿入を防ぎます。

## 出力される HTML / CSS フック

| クラス | 対象 |
| --- | --- |
| `rb-ux__progress` | 進捗バーのトラック（`role="progressbar"`） |
| `rb-ux__progress-bar` | 進捗に応じて `scaleX` されるバー |
| `rb-ux__back-to-top` | トップへ戻る button |
| `rb-ux__back-to-top--visible` | 表示状態のとき付与 |
| `rb-ux__toc-active` | 現在位置の目次リンク |
| `rb-ux__code` | コードブロックのラッパー |
| `rb-ux__copy` | コピーボタン |
| `rb-ux__copy--copied` | コピー直後の一時状態 |

スタイルは `@riebeckite/plugin-ux/style.css` として配布し、テーマの `--rb-color-*` トークンを参照するため既存テーマと競合しません。

## アクセシビリティ

- トップへ戻るボタンは `button` 要素で、`aria-label` を持ちます。
- 進捗バーは `role="progressbar"` と `aria-valuemin` / `aria-valuemax` / `aria-valuenow` を持ちます。
- 目次の現在位置には `aria-current="true"` を付けます。
- `prefers-reduced-motion: reduce` では進捗バーとトップへ戻るボタンのアニメーションを無効化し、トップへ戻る動作も即時スクロールへ切り替えます。
- 印刷時は進捗バー・ボタン・コピーボタンを非表示にします。

## 制限事項

- クライアント専用です。JavaScript が無効な環境では何も追加されません。
- SPA ナビゲーションには対応しません。ページ遷移後は再読み込み時に初期化されます。
- 目次のスクロール連動は `.rr-table-of-contents` または `[data-rb-toc]` を目次コンテナとして探します。
- コードのコピーボタンは `.rr-code`（code-enhance プラグインが管理するブロック）には追加しません。二重のコピー UI を避けるためです。

## 主なエクスポート

- `uxPlugin(options?)` / `ux(options?)`: プラグインを作成する
- `initUx`: クライアント側の初期化
- 型: `UxOptions`、`UxResolvedConfig`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
