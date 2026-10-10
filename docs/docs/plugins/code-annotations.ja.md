# Code Annotations

差分のコードブロックを、対象言語のシンタックスハイライトとRiebeckiteのコードブロックUIで表示します。

[English](./code-annotations.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { codeAnnotations } from "@riebeckite/plugin-code-annotations";

export default defineConfig({
  plugins: [codeAnnotations()],
});
```

シンタックスハイライト、行番号、言語ラベル、コピー操作を使う場合は、
`@riebeckite/plugin-code-enhance` と併用してください。

## 書き方

コードフェンスの言語に `diff` を指定し、その後に対象言語を書きます。`+` で始まる行は追加、
`-` で始まる行は削除、それ以外は変更のない行として扱います。

````md
```diff js
+ const message = "Hello";
- const message = "World";
const unchanged = true;
```
````

`+` と `-` はコード本体とは別に描画されます。そのためJavaScript、TypeScript、Python、JSON
などのシンタックスハイライトを妨げません。コピー操作では、表示された差分と同じくマーカーも含めてコピーします。

対象言語が空、形式が不正、または指定されていないフェンスは、通常の `diff` コードブロックとして扱います。
シンタックスハイライトが対応していない言語を指定しても、ハイライトなしで表示され、ビルドは失敗しません。

## 連携

このプラグインはremark段階で差分マーカーをコード本体から分離し、フェンスメタ情報に記録します。rehype段階では、
マーカーと既存の `rr-code__line--add` / `rr-code__line--remove` クラスを戻します。行ラッパーやコードブロックUIは
`code-enhance` が提供します。両パッケージはimportで依存していないため、個別に設定できます。

## 公開API

- `codeAnnotations()` / `codeAnnotationsPlugin()` — プラグインファクトリ
- `remarkCodeAnnotations()` — Markdown変換
- `rehypeCodeAnnotations()` — HTML変換
- `collectCodeDiff(code)` — 差分マーカーとコード本体を分離
- `serializeCodeDiff(plan)` / `deserializeCodeDiff(value)` — 行情報の変換
- `encodeCodeDiffMeta(plan)` / `extractCodeDiffMeta(meta)` — メタ情報の変換
- 型: `CodeDiffPlan`、`DiffMarker`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
- [`@riebeckite/plugin-code-enhance`](./code-enhance.ja.md)
