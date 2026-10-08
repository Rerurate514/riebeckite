# @riebeckite/plugin-hard-breaks

<!-- Generated from docs/docs/plugins/hard-breaks.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Markdown の通常の改行を `<br>` 要素として出力するプラグインです。Obsidian の
「厳密な改行」をオフにしたときの挙動に合わせます。

[English](./README.md)

## 概要

標準の Markdown では、段落内の単一の改行はソフトブレークとなり、空白として
描画されます。`hardBreaks()` は
[`remark-breaks`](https://github.com/remarkjs/remark-breaks) のトランス
フォーマーを Riebeckite の Markdown パイプラインに登録し、ソフトブレークを
ビルド時に `<br>` 要素へ変換します。

変換は Markdown AST の段階で行われるため、コードブロック、インラインコード、
明示的な hard break の意味は変わりません。クライアント JavaScript と CSS は
追加しません。

## インストール

```ts
import { defineConfig } from "@riebeckite/core";
import { hardBreaks } from "@riebeckite/plugin-hard-breaks";

export default defineConfig({
  // ...
  plugins: [hardBreaks()],
});
```

`riebeckite.config.ts` の `plugins` 配列に `hardBreaks()` を追加します。この
プラグインは opt-in です。追加しない場合、パイプラインは標準の Markdown の
ソフトブレークの挙動を維持します。

## 使い方

```ts
import { hardBreaks } from "@riebeckite/plugin-hard-breaks";

hardBreaks();
```

ファクトリにオプションはありません。

## 変換前後の比較

入力:

```md
今日はいい天気です。
散歩に行きました。
明日も晴れるといいな。
```

プラグインなし（標準の Markdown）では、3 行は 1 行として描画されます。
`hardBreaks()` を有効にすると次のようになります。

```html
<p>今日はいい天気です。<br>
散歩に行きました。<br>
明日も晴れるといいな。</p>
```

## 動作仕様

| 入力 | 動作 |
| --- | --- |
| 段落内の単一の改行 | `<br>` に変換する |
| 空行による段落の分割 | 従来どおり段落を分割する |
| Fenced code block | 変更しない |
| インラインコード | 変更しない |
| 見出し | Markdown の見出し構造を維持する |
| リスト項目内の改行 | Markdown AST の構造に従って処理する |
| Blockquote 内の改行 | 通常の段落と同様に処理する |
| 明示的な hard break（行末の空白 2 つ、または `\`） | 二重変換しない |
| Markdown 内の HTML | そのまま扱う |

## 制約事項

- 変換するのはソフトブレークだけです。空行、リスト、コードブロックの解析方法は
  変わりません。
- 出力はビルド時に確定します。プラグインの一覧を変更したら再ビルドしてください。

## Obsidian との関係

Obsidian には「厳密な改行」という設定があります。これをオフにすると、単一の
改行が改行として表示されます。このプラグインは同じ挙動を Riebeckite の
レンダリング結果に持ち込みます。

## 主なエクスポート

- `hardBreaks()`: プラグインを作成する
- `hardBreaksPlugin`: `hardBreaks` の別名

## 関連資料

- [プラグインガイド](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
