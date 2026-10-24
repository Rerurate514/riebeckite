# @riebeckite/plugin-source-files

<!-- Generated from docs/docs/plugins/source-files.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

指定したテキスト形式のソースファイルを、構文ハイライト対応の独立ページとして公開します。

[English](./README.md)

## 設定

`sourceFiles()` では公開対象の `include` パターンを必ず指定します。ルーティング可能なノートからリンクまたは埋め込みされたファイルだけが公開されるため、下書きや公開予定のノートからソースページが露出することはありません。

```ts
import { defineConfig } from "@riebeckite/core";
import { obsidianMarkdown } from "@riebeckite/plugin-obsidian-markdown";
import { codeEnhance } from "@riebeckite/plugin-code-enhance";
import { sourceFiles } from "@riebeckite/plugin-source-files";

export default defineConfig({
  plugins: [
    obsidianMarkdown(),
    codeEnhance({ lineNumbers: true }),
    sourceFiles({
      include: ["src/**/*.ts", "scripts/*.ts"],
      exclude: ["src/generated/**"],
    }),
  ],
});
```

## リンクと埋め込み

- `[src/main.ts](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/src/main.ts.ja.md)` は `/source/src/main.ts/` のページへリンクします。
- `![src/main.ts](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/src/main.ts.ja.md)` は既存のコードブロック表示経路でソースを表示します。
- `#L10` と `#L10-L20` は埋め込みの行範囲を選びます。Code Enhance を有効にすると、ソースページでも該当の行または範囲へスクロールし、強調表示します。

ソースページには Vault 相対パス、検出した言語、サイズとダウンロードリンクを表示します。

## 実行例

以下のソースは、このページ上でソースページへのリンク、ファイル全体の埋め込み、行範囲の埋め込みとして実際に描画されます。

#### ソース

````md
[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
````

#### 実行例

[source-file-example.ts](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/source-file-example.ts.ja.md)

![source-file-example.ts](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/source-file-example.ts.ja.md)

![source-file-example.ts#L3-L5](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/source-file-example.ts.ja.md#L3-L5)

## 安全性と公開境界

`include` に一致し `exclude` に一致しないファイルだけが対象です。不正な論理パス、バイナリ、UTF-8 として読めない内容、`maxBytes` を超えるファイル、代表的な秘密ファイル名・拡張子（`.env`、鍵、証明書、credentials）は拒否します。設定済みの `ContentSource` だけを利用し、ファイルシステムのパスを直接読んだり絶対パスを表示したりしません。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `include` | `readonly string[]` | 必須 | 公開する Vault 相対 `*` / `**` パターン |
| `exclude` | `readonly string[]` | `[]` | 一致したパスを公開対象から除外 |
| `maxBytes` | `number` | `1048576` | 受け入れる UTF-8 ファイルの最大バイト数 |

## 公開 API

- `sourceFiles(options)` / `sourceFiles`
- `sourceFilePath(path)`
- `SourceFilesOptions`

## 関連資料

- [`@riebeckite/plugin-obsidian-markdown`](../obsidian-markdown/README_ja.md)
- [`@riebeckite/plugin-code-enhance`](../code-enhance/README_ja.md)
