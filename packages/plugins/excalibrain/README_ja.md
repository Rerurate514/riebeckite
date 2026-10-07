# @riebeckite/plugin-excalibrain

ノートの関係を構造化して表示するプラグインです。[ExcaliBrain](https://github.com/zsviczian/excalibrain)（Zsolt Viczián）の考え方をモデルにしています。

[English](./README.md)

## 概要

`excaliBrain()` はノートごとに 7 つの領域を持つマップを描画します。

| 領域 | 位置 | ロール |
| --- | --- | --- |
| Parents | 上 | `parent` |
| Children | 下 | `child` |
| Left friends | 左 | `leftFriend` |
| Right friends | 右 | `rightFriend` |
| Previous | 左端 | `previous` |
| Next | 右端 | `next` |
| Siblings | 周辺 | `sibling` |

関係は ExcaliBrain のオントロジーに従い、YAML frontmatter と本文中の Dataview インラインフィールドから取得します。明示されていない関係は、コンテンツグラフから推論します。

## 設定する

```ts
import { defineConfig } from "@riebeckite/core";
import { excaliBrain } from "@riebeckite/plugin-excalibrain";

export default defineConfig({
  // ...
  plugins: [
    excaliBrain({
      render: "build",
    }),
  ],
});
```

このプラグインは `order: -10` で実行されます。

## 関係の書き方

明示した関係は推論より優先されます。

### YAML frontmatter

```md
---
title: ExcaliBrain Center
parent: "[[excalibrain-parent]]"
children: ["[[excalibrain-child-a]]", "[[excalibrain-child-b]]"]
---
```

### Dataview インラインフィールド

```md
children:: [[excalibrain-child]]

related:: [[note-a]] and [[note-b]] are similar
```

フィールドは単独行でも、`[field:: [[target]]]` のように角括弧で囲んでも認識します。

### オントロジー

フィールド名は大文字小文字を区別せず、空白はハイフンに正規化して照合します。既定のオントロジーは次のとおりです。

| ロール | フィールド名 |
| --- | --- |
| `parents` | `parent`, `parents`, `up`, `u`, `north`, `origin`, `inception`, `source`, `parent domain` |
| `children` | `children`, `child`, `down`, `d`, `south`, `leads to`, `contributes to`, `nurtures` |
| `leftFriends` | `friends`, `friend`, `jump`, `jumps`, `j`, `similar`, `supports`, `alternatives`, `advantages`, `pros` |
| `rightFriends` | `opposes`, `disadvantages`, `missing`, `cons` |
| `previous` | `previous`, `prev`, `west`, `w`, `before` |
| `next` | `next`, `n`, `east`, `e`, `after` |
| `hidden` | `hidden` |

`ontology` オプションは既定のオントロジーを拡張します。各ロールのフィールド名は、そのロールの既定値を置き換えるのではなく末尾に追加されます。既存のフィールドを別のロールに追加することもできますが、正規の順序（`parents`、`children`、`leftFriends`、`rightFriends`、`previous`、`next`、`hidden`）で先に現れるロールが優先されます。

`hidden` は ExcaliBrain と同じく、このノートのマップから隠すターゲットを列挙するもので、ノート自体を隠すことはありません。`showHidden` を指定すると、これらのターゲットも表示します。

## 推論

`infer` が有効な場合（既定）、次のように推論します。

- このノートから相手へのリンクは `child`
- 相手からこのノートへのバックリンクは `parent`
- 相互リンクは `leftFriend`

`siblings` が有効な場合（既定）、親ノートの他の子ノートを `sibling` として追加します。兄弟の推論には `infer` も必要で、`infer: false` にすると無効になります。リンク先はコンテンツマニフェストから解決し、解決できない場合は元のリンクテキストをラベルにした仮想ノード（`data-node-virtual="true"`）にします。

## 公開範囲

ノードはコンテンツマニフェストから解決します。`publishing.routable` が false のターゲットはマップから除外するため、公開対象外のノートがノードやリンクとして現れることはなく、タイトルやパーマリンクも漏れません。

## 描画

`render` で描画する場所を選びます。

| モード | 動作 |
| --- | --- |
| `"build"`（既定） | ビルド時に SVG を生成し、記事に埋め込みます |
| `"client"` | `div.rb-excalibrain__canvas` にグラフとレイアウトのペイロードをエスケープして持ち、`initExcaliBrain()` がブラウザで SVG を生成します |
| `"both"` | 埋め込み SVG とクライアント側の描画を併用します（プログレッシブエンハンスメント） |

### 差し込み方

- ` ```excalibrain ` フェンスがある場合は、そのプレースホルダーをマップに置き換えます。
- フェンスがなく、`auto` が有効で関係が 1 つ以上ある場合は、記事 HTML の末尾にマップのセクションを追加します（マニフェストのエントリとキャッシュ済みの記事 HTML の両方を更新します）。

`heading` と `headingText` は任意の `<h2>` を制御します。

## オプション

| 項目 | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `render` | `"build" \| "client" \| "both"` | `"build"` | 描画する場所 |
| `auto` | `boolean` | `true` | フェンスがないノートにマップを追加する |
| `heading` | `boolean` | `true` | 見出しを表示する |
| `headingText` | `string` | `"ExcaliBrain"` | 見出しの文字列 |
| `className` | `string` | `"rb-excalibrain"` | ルートの CSS クラス |
| `maxPerRegion` | `number` | `8` | 領域ごとの最大ノード数 |
| `infer` | `boolean` | `true` | リンクから関係を推論する |
| `siblings` | `boolean` | `true` | 親から兄弟を推論する（`infer` が必要） |
| `ontology` | object | — | ロールごとに末尾追加するオントロジーのフィールド名 |
| `showHidden` | `boolean` | `false` | `hidden` フィールドで指定したターゲットも含める |
| `width` | `number` | `720` | SVG viewBox の幅 |
| `height` | `number` | `480` | SVG viewBox の高さ |
| `language` | `string` | `"excalibrain"` | 対象にするフェンス言語 |

## 出力

```html
<section class="rb-excalibrain" data-excalibrain
         data-excalibrain-render="build"
         data-excalibrain-center="notes/center">
  <h2 class="rb-excalibrain__heading">ExcaliBrain</h2>
  <div class="rb-excalibrain__canvas">
    <svg class="rb-excalibrain__svg" viewBox="0 0 720 480" role="img">…</svg>
  </div>
</section>
```

領域は `g.rb-excalibrain__region[data-region]`、ノードは `g.rb-excalibrain__node[data-node-role][data-node-slug][data-relation-type]` で、`<a href>` が `<rect>` と `<text>` を包みます。リンクは `path.rb-excalibrain__link[data-link-role][data-relation-type]` です。

## 制約

- マップは閲覧専用です。クライアント側の処理は SVG を生成するだけで、ドラッグ、ズーム、展開・折りたたみの操作はありません。
- `maxPerRegion` は領域ごとのノード数を打ち切るため、関係が多いノートでは先頭のノードだけを表示します。
- 描画できるのは上記のオントロジーのロールだけで、ノード単位のスタイルや領域単位の設定は下記のオプション以外にありません。

## 主なエクスポート

- `excaliBrain(options?)` / `excaliBrainPlugin`: プラグインを作成する
- `resolveExcaliBrainOptions(options?)`: 既定値を解決する
- `buildExcaliBrainGraph(input)`: 純粋なグラフ構築
- `layoutExcaliBrain(graph, options?)`: 決定的なレイアウト
- `renderExcaliBrainSvg(graph, layout, options?)`: 純粋な SVG 描画
- 型: `ExcaliBrainOptions`、`ExcaliBrainGraph`、`ExcaliBrainNode`、`ExcaliBrainLink`、`ExcaliBrainLayout`、`ExcaliBrainRole`、`ExcaliBrainRenderMode` ほか

## 関連資料

- [プラグインシステム](../../../docs/docs/reference/plugin-api.md)

