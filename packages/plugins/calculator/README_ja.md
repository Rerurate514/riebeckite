# @riebeckite/plugin-calculator

<!-- Generated from docs/docs/plugins/calculator.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Calculator Plugin は `calc` コードブロックに書かれた固定の算術式を評価します。
サーバーが静的ページ用に結果を描画し、ブラウザーが同じ式を Riebeckite の
Interactive Runtime 経由で再評価します。

[English](./README.md)

## できること

- `calc` ブロックをサーバー側で結果として描画します。
- 同じ式をブラウザーで Interactive Runtime 経由で再評価します。
- JavaScript や Runtime が使えない場合は、サーバーの結果をフォールバックとして残します。

## これは何ではないか

入力に応じて結果が変わる計算機ではありません。式はビルド時に Markdown の
ソースへ固定され、読者が数値を入力したり式を変更したりすることはできません。
入力駆動のウィジェットには、フォームの状態を読み取って Runtime を呼び出す
独自の Plugin が必要です。この Plugin はそれを実装していません。

## インストール

```sh
npm install @riebeckite/plugin-calculator
```

`riebeckite.config.ts` に Plugin を登録します。

```ts
import { calculator } from "@riebeckite/plugin-calculator";

export default defineConfig({
  plugins: [calculator()],
});
```

## 式を書く

フェンス付きコードブロックの言語に `calc` を指定します。

```calc
2 * (3 + 4)
```

結果は `14` です。同じ値をサーバーでも描画するため、JavaScript が使えない
場合でも結果を読めます。JavaScript が有効な場合は Runtime をマウントして式を
再評価し、静的な値をライブの結果に置き換えます。

## 対応する式

数値、`+`、`-`、`*`、`/`、単項符号、括弧、空白を扱います。式は 200 文字まで
です。ゼロ除算や不正な入力では Runtime を起動せず、エラーメッセージを表示
します。

パーサーは小さな再帰下降評価器です。`eval` や `new Function` は使わず、
Markdown ブロックから任意の JavaScript を実行することはできません。

## ライフサイクルとフォールバック

各 Calculator ブロックは `calculator` という Runtime ID のインスタンスを 1 つ
持ちます。インスタンスは Plugin の Runtime Registry から生成され、SPA
ナビゲーション時のページスコープと一緒に破棄されます。マークアップは
`@riebeckite/runtime` の `data-runtime-fallback`、`data-runtime-loading`、
`data-runtime-error` という標準の取り決めを使います。

- JavaScript がない場合は `data-runtime-fallback` がサーバーの結果を表示します。
- Runtime の起動中は `data-runtime-loading` が表示されます。
- 評価が完了すると、ライブの出力が静的な値を置き換えます。
- Runtime が失敗した場合は静的な値が残り、`data-runtime-error` が
  `role="alert"` で失敗を通知します。

初期化処理は `[data-calculator]` を含むページでのみ読み込まれ、Runtime
モジュールは Plugin の `runtimeEntries` 契約を通じて遅延読み込みされます。

## セキュリティ

この Plugin は信頼済みのファーストパーティコードをメインスレッドで実行します。
未信頼コード用のサンドボックスではありません。未信頼のマークアップや
スクリプトには、サンドボックス化された iframe Runtime を使用してください。
Worker と WebAssembly は単独ではセキュリティ境界になりません。

## 公開 API

- `calculator()` は Plugin 定義を生成します。
- `evaluateExpression(source)` は `{ ok: true, value }` または
  `{ ok: false, reason }` を返します。
- `renderCalculator(expression)` は静的な HTML と Runtime のマウント位置を
  描画します。
- `remarkCalculator` は Markdown ビルド中に `calc` コードブロックを変換します。
- `createCalculatorRuntime()` は Plugin のクライアントエントリが使う Runtime
  定義を生成します。
