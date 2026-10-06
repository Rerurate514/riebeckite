# @riebeckite/plugin-qr-code

` ```qr ` コードブロックを、ビルド時にインライン SVG の QR コードへ変換するプラグインです。

[English](./README.md)

## 概要

`qrCode()` は QR コードのコードブロックを `<figure class="rb-qr">` に置き換え、インラインの `<svg>` を埋め込みます。エンコードはビルド時の Node 上で完結し、ブラウザには何も配信しません。`order: -10` で実行されるため、`code-enhance` や `code-tabs` より先に処理されます。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { qrCode } from "@riebeckite/plugin-qr-code";

export default defineConfig({
  // ...
  plugins: [
    qrCode({
      level: "M",
      margin: 1,
      width: 160,
      dark: "#000000",
      light: "#ffffff",
    }),
  ],
});
```

````md
```qr
# caption: プロジェクトページ
https://example.com/
```
````

フェンス本文がエンコード対象のテキストまたは URL です（前後の空白は除去します）。本文が空の場合、コードブロックはそのまま残し、`@riebeckite/plugin-qr-code` を発行元とする診断を出します。

## 出力

各ブロックは次の形になります。

```html
<figure class="rb-qr" data-qr="rendered" data-qr-level="M" data-qr-margin="1">
  <figcaption class="rb-qr__caption">…</figcaption>
  <div class="rb-qr__canvas" role="img"><svg>…</svg></div>
  <details class="rb-qr__fallback">
    <summary>QR source</summary>
    <pre><code>…</code></pre>
  </details>
</figure>
```

- `data-qr` は成功時に `"rendered"`、エンコーダを読み込めない場合やエンコードに失敗した場合に `"error"` になります。
- 元のテキストは `details.rb-qr__fallback` に残ります（`fallback: false` の場合は除く）。エラー時も内容が失われることはありません。
- エラーと空ブロックは `source: "@riebeckite/plugin-qr-code"` の診断として報告されます。

### エンコーダの読み込み

QR エンコーダ（`qrcode`）はビルド時に動的インポートするため、サイト側・クライアント側のバンドルには含まれません。プラグインが一時的な設定モジュールへバンドルされ、ベア指定子が解決できなくなった場合は、`process.cwd()` と pnpm の仮想ストアから `node_modules` を探索してフォールバックします。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `level` | `"L" \| "M" \| "Q" \| "H"` | `"M"` | 誤り訂正レベル |
| `margin` | `number` | `1` | 余白（モジュール数） |
| `width` | `number` | `160` | 表示サイズ（px） |
| `size` | `number` | — | `width` の別名 |
| `dark` | `string` | `"#000000"` | 暗モジュールの色 |
| `light` | `string` | `"#ffffff"` | 明モジュールの色 |
| `caption` | `boolean` | `true` | タイトルまたは `# caption:` 行をキャプションとして表示する |
| `className` | `string` | `"rb-qr"` | figure の CSS クラス |
| `language` | `string` | `"qr"` | 対象とするフェンス言語 |
| `fallback` | `boolean` | `true` | 元のテキストを `<details>` に残す |

キャプションはコードブロックの `title`（コードメタ）または先頭の `# caption: …` 行から取得します。先頭のキャプション行はエンコード対象から取り除きます。

## 主なエクスポート

- `qrCode(options?)`: プラグインを作成する
- `qrCodePlugin`: `qrCode` の別名
- `resolveQrCodeOptions(options?)`: オプションを正規化する
- `buildQrSvg(text, options)`: テキストを SVG 文字列へエンコードする
- 型: `QrCodeOptions`、`ResolvedQrCodeOptions`、`QrCodeLevel`、`QrBuildResult`

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)

