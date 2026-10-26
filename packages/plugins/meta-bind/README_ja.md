# @riebeckite/plugin-meta-bind

<!-- Generated from docs/docs/plugins/meta-bind.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

[Obsidian Meta Bind](https://www.moritzjung.dev/obsidian-meta-bind-plugin-docs/) の構文のうち、安全に静的サイトへ対応できる部分を、ブラウザ内の状態として表示するプラグインです。

[English](./README.md)

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { metaBind } from "@riebeckite/plugin-meta-bind";

export default defineConfig({
  plugins: [metaBind()],
});
```

## 対応構文

インラインの入力欄と表示欄には、Meta Bind と同じMarkdown形式を使えます。

```md
進捗: `INPUT[slider(minValue(0), maxValue(10), stepSize(1)):progress]`

2倍の進捗: `VIEW[{progress} * 2]`
```

初期値はfrontmatterから読みます。操作後の値はそのページ内のReader Stateだけに保持し、Markdownファイルやfrontmatterは書き換えません。

```md
---
done: false
priority: 2
---

`INPUT[toggle:done]` `INPUT[number(minValue(1), maxValue(5)):priority]`
`VIEW[{done} && {priority} >= 3]`
```

複数の欄やselectは、`meta-bind` コードブロックに記述します。

````md
```meta-bind
INPUT[select(option(low), option(high)):priority]
VIEW[{priority}]
```
````

対応する入力型は `text`、`number`、`slider`、`toggle`、コードブロック内の `select` です。式では同一ページの `{property}`、リテラル、丸括弧、`!`、`-`、算術演算、比較、等値比較、`&&`、`||` を使えます。

## 実行例

以下のコントロールはページ内の Reader State だけを更新し、Markdown や frontmatter は書き換えません。

`INPUT[text:meta_bind_text]` `INPUT[number(minValue(1), maxValue(5)):meta_bind_number]`

`INPUT[slider(minValue(0), maxValue(10), stepSize(1)):meta_bind_slider]` `INPUT[toggle:meta_bind_toggle]`

現在のページタイトル: `VIEW[{title}]`

~~~meta-bind
INPUT[select(option(low), option(medium), option(high)):meta_bind_select]
VIEW[{meta_bind_select}]
~~~

## 対応範囲と安全性

`status` や `task.done` のような同一ページの単純なfrontmatterパスだけを扱います。別ノート参照、storage・memoryの参照、角括弧のパス、button action、JavaScript View、VIEWの書き戻し、Obsidian command、ファイル書き込みは実行しません。これらは元のMarkdownのまま残し、ビルド診断を出します。

生成HTMLには、各フィールドで参照したfrontmatter値だけを含めます。値はエスケープし、式は `eval` や `Function` を使わずに解析します。式の深さと実行ステップにも上限があります。JavaScriptが無効な場合でも、入力欄は初期値を、表示欄は初期結果を示します。

ブラウザ用モジュールはMeta Bindフィールドを含むページだけで読み込み、SPA遷移後はページライフサイクルに合わせて再初期化します。

## 公開API

- `metaBind()`：プラグインファクトリ
- `parseMetaBind(source, inline?)`：安全な互換構文パーサー
- `remarkMetaBind()`：Markdown変換
- `initMetaBind(context)`：ブラウザ初期化関数
- `MetaBindModel`、`MetaBindParseResult`：型

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
