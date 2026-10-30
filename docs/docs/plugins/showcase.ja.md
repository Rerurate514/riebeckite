---
date: 2026-10-08
title: プラグインの動作例
showcase_progress: 4
showcase_priority: low
---
# プラグインの動作例

プラグインの一覧は [プラグイン](./README.ja.md) にあります。このページでは、プラグインが実際に何を生成するかを確認できます。各項目では Markdown のソースと、Riebeckite 上での実行例を並べています。

> 生成される `showcase` プリセットでは、ここにあるような例をローカルで確認できます。

## Obsidian Markdown

### Callouts：[`obsidian-markdown`](./obsidian-markdown.ja.md)

#### ソース

````md
> [!tip] 試してみる
> Callout は `[!type]` マーカー付きの block quote です。

> [!info] 情報
> 情報用の callout も同じ書き方です。

> [!warning] 警告
> 警告は追加設定なしで使えます。

> [!question] 質問
> 未解決の論点には question を使います。
````

#### 実行例

> [!tip] 試してみる
> Callout は `[!type]` マーカー付きの block quote です。

> [!info] 情報
> 情報用の callout も同じ書き方です。

> [!warning] 警告
> 警告は追加設定なしで使えます。

> [!question] 質問
> 未解決の論点には question を使います。

### WikiLinks と埋め込み：[`obsidian-markdown`](./obsidian-markdown.ja.md)

#### ソース

````md
[[README]] と [[plugins/README|Plugin catalog]] への WikiLink。

ノートの埋め込み：

![[head-tag]]

画像の埋め込み：

![[riebeckite-logo-horizontal.png]]
````

#### 実行例

[[README]] と [[plugins/README|Plugin catalog]] への WikiLink。

ノートの埋め込み：

![[head-tag]]

画像の埋め込み：

![[riebeckite-logo-horizontal.png]]

ブロック参照 `![[head-tag#^block]]` は、対象ノートにブロック ID がある場合に使えます。

### Hard breaks：[`hard-breaks`](./hard-breaks.ja.md)

`hardBreaks()` は単一の改行をすべて `<br>` に変換します。opt-in のプラグインで、このサイトでは有効にしていないため、次の 3 行は 1 つの段落として表示されます。

#### ソース

````md
1 行目
2 行目
3 行目
````

#### 実行例

1 行目
2 行目
3 行目

有効にすると各行が独立した行になります。

## 生成ページ

### Timeline：[`timeline`](./timeline.ja.md)

#### ソース

````md
---
title: 初回リリース
date: 2026-01-15
---
````

#### 実行例

[Timeline を開く](/timeline)

### Glossary：[`glossary`](./glossary.ja.md)

#### ソース

````md
---
title: 静的サイト生成
glossary: true
term: SSG
definition: デプロイ前に HTML を生成する方式です。
---
````

#### 実行例

[Glossary を開く](/glossary)

### Archive：[`archive`](./archive.ja.md)

ノートの frontmatter にある日付から、月別の一覧ページを生成します。ページは `/archive/<yyyy>/<mm>` に出力されます。

#### 実行例

[2026 年 10 月の Archive を開く](/archive/2026/10)

## Code

### Toolbar 付きコード：[`code-enhance`](./code-enhance.ja.md)

行番号、ファイル名バー、行ハイライト、copy button を確認できます。

#### ソース

````md
```ts title="hello.ts"
export function hello(name: string): string {
  return `こんにちは、${name}`;
}
```
````

#### 実行例

```ts title="hello.ts"
export function hello(name: string): string {
  return `こんにちは、${name}`;
}
```

### Code tabs：[`code-tabs`](./code-tabs.ja.md)

隣り合った `tab="..."` 付き code fence が、1 つの tab group になります。

#### ソース

````md
```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```
````

#### 実行例

```ts tab="React"
const greeting = "Hello from React";
```

```js tab="Vanilla"
console.log("Hello from JavaScript");
```

### Code annotations：[`code-annotations`](./code-annotations.ja.md)

`diff` フェンスに対象言語を指定して、追加行と削除行を表示します。

#### ソース

````md
```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```
````

#### 実行例

```diff js
const kept = true;
+ const added = "new line";
- const removed = false;
```

### Source Files：[`source-files`](./source-files.ja.md)

対象のテキストファイルをページとして公開し、ファイル全体や行範囲を埋め込めます。

#### ソース

````md
[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]
````

#### 実行例

[[source-file-example.ts]]

![[source-file-example.ts]]

![[source-file-example.ts#L3-L5]]

## インライン表現

### Highlight：[`highlight`](./highlight.ja.md)

`==text==` で囲んだ範囲をインラインで強調します。

#### ソース

````md
この文は ==強調== され、ほかはそのまま表示されます。
````

#### 実行例

この文は ==強調== され、ほかはそのまま表示されます。

### Sidenotes：[`sidenotes`](./sidenotes.ja.md)

脚注記法が、本文の横に並ぶ補足へ変換されます。

#### ソース

````md
本文中で補足を参照します。[^1]

[^1]: ここが sidenote の本文です。
````

#### 実行例

本文中で補足を参照します。[^1]

[^1]: ここが sidenote の本文です。

### Shortcodes：[`shortcodes`](./shortcodes.ja.md)

`::name` と `:::name` のディレクティブで、badge、kbd、note などを差し込みます。

#### ソース

````md
::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[補足]
本文をそのまま書けます。
:::
````

#### 実行例

::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[補足]
本文をそのまま書けます。
:::

## 図表

### Mermaid (Pele)：[`mermaid-pele`](./mermaid-pele.ja.md)

#### ソース

````md
```mermaid
flowchart LR
  A[Note] --> B{Published?}
  B -->|yes| C[Site]
  B -->|no| D[Draft]
```
````

#### 実行例

```mermaid
flowchart LR
  A[Note] --> B{Published?}
  B -->|yes| C[Site]
  B -->|no| D[Draft]
```

### Mermaid（headless browser）：[`mermaid`](./mermaid.ja.md)

`mermaid` プラグインは同じ `mermaid` フェンスを、ビルド時に headless browser で SVG に変換します。このサイトでは Chromium を必要としない Mermaid (Pele) を使っています。

### D2：[`d2`](./d2.ja.md)

#### ソース

````md
```d2
site: Riebeckite
content -> build -> deploy
```
````

#### 実行例

```d2
site: Riebeckite
content -> build -> deploy
```

### Graphviz / DOT：[`graphviz`](./graphviz.ja.md)

#### ソース

````md
```dot
digraph G {
  notes -> pages;
  pages -> html;
}
```
````

#### 実行例

```dot
digraph G {
  notes -> pages;
  pages -> html;
}
```

### Chart.js：[`chartjs`](./chartjs.ja.md)

#### ソース

````md
```chart
{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  }
}
```
````

#### 実行例

```chart
{
  "type": "bar",
  "data": {
    "labels": ["Mon", "Tue", "Wed"],
    "datasets": [{ "label": "Visits", "data": [12, 19, 8] }]
  }
}
```

### Vega-Lite：[`vega-lite`](./vega-lite.ja.md)

#### ソース

````md
```vega-lite
{
  "title": "Revenue",
  "data": { "values": [{ "category": "A", "value": 28 }, { "category": "B", "value": 55 }] },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
```
````

#### 実行例

```vega-lite
{
  "title": "Revenue",
  "data": { "values": [{ "category": "A", "value": 28 }, { "category": "B", "value": 55 }] },
  "mark": "bar",
  "encoding": {
    "x": { "field": "category", "type": "nominal" },
    "y": { "field": "value", "type": "quantitative" }
  }
}
```

### WaveDrom：[`wavedrom`](./wavedrom.ja.md)

#### ソース

````md
```wavedrom
{ "signal": [
  { "name": "clk", "wave": "p......" },
  { "name": "bus", "wave": "x.34.5x", "data": "head body tail" }
] }
```
````

#### 実行例

```wavedrom
{ "signal": [
  { "name": "clk", "wave": "p......" },
  { "name": "bus", "wave": "x.34.5x", "data": "head body tail" }
] }
```

### Markmap：[`markmap`](./markmap.ja.md)

#### ソース

````md
```markmap
# Project

## Design

### Notation
### Rendering

## Delivery
```
````

#### 実行例

```markmap
# Project

## Design

### Notation
### Rendering

## Delivery
```

### Marp slides：[`marp`](./marp.ja.md)

#### ソース

````md
```marp title="Intro deck"
# First slide

- a bullet

---

# Second slide
```
````

#### 実行例

```marp title="Intro deck"
# First slide

- a bullet

---

# Second slide
```

### Maps：[`map`](./map.ja.md)

静的な fallback を先に表示し、JavaScript が有効な環境では interactive map に拡張します。

#### ソース

````md
```map
center: 35.6812, 139.7671
zoom: 13
label: Tokyo Station
markers:
  - 35.6812, 139.7671 | Tokyo Station
  - 35.6586, 139.7454 | Tokyo Tower
```
````

#### 実行例

```map
center: 35.6812, 139.7671
zoom: 13
label: Tokyo Station
markers:
  - 35.6812, 139.7671 | Tokyo Station
  - 35.6586, 139.7454 | Tokyo Tower
```

### QR codes：[`qr-code`](./qr-code.ja.md)

Build 時に inline SVG として生成します。

#### ソース

````md
```qr
# caption: Project page
https://example.com/
```
````

#### 実行例

```qr
# caption: Project page
https://example.com/
```

### PlantUML：[`plantuml`](./plantuml.ja.md)

図はビルド時に PlantUML サーバーの画像 URL へ変換されます。表示にはそのサーバーへ到達できる必要があります。

#### ソース

````md
```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```
````

#### 実行例

```plantuml
@startuml
Alice -> Bob: Hello
Bob --> Alice: Hi
@enduml
```

### Canvas：[`canvas`](./canvas.ja.md)

JSON Canvas をコードフェンスへ直接書くか、`![[diagram.canvas]]` で Canvas ファイルを埋め込みます。

#### ソース

````md
```canvas
{
  "nodes": [
    { "id": "note", "type": "text", "x": 0, "y": 0, "width": 240, "height": 100, "text": "Note" }
  ],
  "edges": []
}
```
````

#### 実行例

```canvas
{
  "nodes": [
    { "id": "note", "type": "text", "x": 0, "y": 0, "width": 240, "height": 100, "text": "Note" }
  ],
  "edges": []
}
```

## Media

### 音声と動画：[`media`](./media.ja.md)

音声と動画の添付ファイルは、ブラウザ標準のプレイヤーで再生できます。次の例は短い無音の WAV です。

#### ソース

````md
![[media-example.wav]]
````

#### 実行例

![[media-example.wav]]

### Attachments：[`attachment`](./attachment.ja.md)

通常の WikiLink はダウンロードリンクに、埋め込み WikiLink は添付カードになります。

#### ソース

````md
[[attachment-example.txt]]

![[attachment-example.txt]]
````

#### 実行例

[[attachment-example.txt]]

![[attachment-example.txt]]

### PDF：[`pdf`](./pdf.ja.md)

埋め込んだ PDF はブラウザ標準の PDF ビューアで表示されます。

#### ソース

````md
![[pdf-example.pdf]]
````

#### 実行例

![[pdf-example.pdf]]

### Rich embeds：[`rich-embed`](./rich-embed.ja.md)

URL を YouTube、Vimeo、Spotify、CodePen、Gist などの埋め込みに変換します。

#### ソース

````md
```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```
````

#### 実行例

```embed
https://www.youtube.com/watch?v=dQw4w9WgXcQ
title: Demo video
caption: A short caption
aspect: 16/9
```

### Gallery cards：[`gallery`](./gallery.ja.md)

#### ソース

````md
```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```
````

#### 実行例

```gallery
columns: 3
items:
  - title: Default
    description: A clean, typographic theme.
    href: https://riebeckite.dev/docs/themes/default
  - title: Minimal
    description: Stripped back to the essentials.
    href: https://riebeckite.dev/docs/themes/minimal
  - title: Gruvbox
    description: A warm, high-contrast palette.
    href: https://riebeckite.dev/docs/themes/gruvbox
```

### Excalidraw：[`excalidraw`](./excalidraw.ja.md)

Excalidraw 形式のノートを埋め込むと、ブラウザ側で SVG に置き換わります。このサイトでは `assets/HW.md` の図を埋め込んでいます。

#### ソース

````md
![[HW]]
````

#### 実行例

![[HW]]

### Responsive image：[`responsive-image`](./responsive-image.ja.md)

画像を `![[...]]` で埋め込むと、対応する候補画像がある場合は `<picture>` と複数サイズの候補に展開されます。

#### ソース

````md
![[riebeckite-logo-horizontal.png]]
````

#### 実行例

![[riebeckite-logo-horizontal.png]]

### Lightbox：[`lightbox`](./lightbox.ja.md)

画像をクリックすると、アクセシブルなダイアログで拡大表示されます。

#### ソース

````md
![[riebeckite-logo.png]]
````

#### 実行例

![[riebeckite-logo.png]]

### AutoCardLink：[`autocardlink`](./autocardlink.ja.md)

`cardlink` フェンスに URL とメタ情報を書くと、リンクカードになります。

#### ソース

````md
```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: Markdown から静的サイトを作るツール
host: example.com
```
````

#### 実行例

```cardlink
url: https://example.com/riebeckite
title: Riebeckite
description: Markdown から静的サイトを作るツール
host: example.com
```

## ナレッジとデータ

### Citations：[`citations`](./citations.ja.md)

インライン引用は番号付きリンクになり、ページ末尾に References セクションが追加されます。

#### ソース

````md
Riebeckite は Markdown[@gruber2004] を基盤にし、独自の Plugin モデルを備えています。[@riebeckite2026]

複数の出典をまとめて引用できます。[@riebeckite2026; @gruber2004]
````

#### 実行例

Riebeckite は Markdown[@gruber2004] を基盤にし、独自の Plugin モデルを備えています。[@riebeckite2026]

複数の出典をまとめて引用できます。[@riebeckite2026; @gruber2004]

### Dataview：[`dataview`](./dataview.ja.md)

#### ソース

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

#### 実行例

```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```

### Query：[`query`](./query.ja.md)

#### ソース

````md
```query
sort:
  field: title
  order: asc
limit: 5
```
````

#### 実行例

```query
sort:
  field: title
  order: asc
limit: 5
```

### Bases：[`bases`](./bases.ja.md)

#### ソース

````md
```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
views:
  - type: table
    name: Featured
    limit: 10
```
````

#### 実行例

```base
filters:
  and:
    - file.hasTag("featured")
properties:
  file.name:
    displayName: Title
views:
  - type: table
    name: Featured
    limit: 10
```

### Meta Bind：[`meta-bind`](./meta-bind.ja.md)

インライン入力とビューはページローカルの状態を使います。初期値はフロントマターから読み込みます。

#### ソース

````md
進捗：`INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

2 倍の進捗：`VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```
````

#### 実行例

進捗：`INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

2 倍の進捗：`VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```

### Kanban boards：[`kanban`](./kanban.ja.md)

本文に `##` 見出しの列と task list を置くと board になります。

#### ソース

````md
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
````

#### 実行例

```kanban
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
```

### Flashcards：[`flashcards`](./flashcards.ja.md)

`front :: back` を並べた `flashcards` フェンスが、学習用のデッキになります。JavaScript が無効な環境でも静的なリストとして読めます。

#### ソース

````md
```flashcards
Riebeckite とは？ :: Markdown から静的サイトを作るツール

公開の単位は？ :: Note
```
````

#### 実行例

```flashcards
Riebeckite とは？ :: Markdown から静的サイトを作るツール

公開の単位は？ :: Note
```

### ExcaliBrain：[`excalibrain`](./excalibrain.ja.md)

ノートごとの関係を 7 つの領域に分けて表示します。`excalibrain` フェンスの中身は読みません。フェンスは「ここに描画する」という位置だけを決め、マップの中身はそのページ自身のリンクから組み立てます。

#### ソース

````md
```excalibrain
```
````

#### 実行例

```excalibrain
```

上のマップには、このページの WikiLink から推論した関係が入ります。各 Plugin ページへは Markdown の相対リンクでリンクしているため、`child` に入るのは WikiLink で指定したページだけです。`parent` にはこのページへ WikiLink でリンクしているページが、`sibling` には `parent` が WikiLink でリンクしているページが並びます。

## ページやサイト全体に作用する Plugin

次の Plugin は 1 つの Markdown 断片では表現できません。多くはこのページ上でも検索 box、目次、color mode toggle などとして確認できます。opt-in の項目は設定するまで表示されません。

| Plugin | 確認するもの |
| --- | --- |
| [`search`](./search.ja.md) | サイトを絞り込む検索ボックス |
| [`toc`](./toc.ja.md) | スクロール位置に追従する目次 |
| [`backlinks`](./backlinks.ja.md) | このノートを参照するノートの一覧 |
| [`related-posts`](./related-posts.ja.md) | note 末尾の関連記事一覧 |
| [`properties`](./properties.ja.md) | フロントマターのプロパティ一覧 |
| [`article-metadata`](./article-metadata.ja.md) | 記事ヘッダーの公開日・読了時間・タグ |
| [`icons`](./icons.ja.md) | Obsidian Iconize / Iconic のアイコンをナビ、検索、タグ、プロパティに表示（opt-in） |
| [`navigation`](./navigation.ja.md) | 設定または Vault から組み立てるサイトナビ |
| [`ux`](./ux.ja.md) | 読書プログレス、戻るボタン、目次の scroll-spy |
| [`text-fragment`](./text-fragment.ja.md) | 選択テキストのリンク・引用コピー |
| [`meta-bind`](./meta-bind.ja.md) | ページローカルの状態を使うインライン入力とビュー |
| [`breadcrumbs`](./breadcrumbs.ja.md) | ページ階層のパンくず |
| [`share`](./share.ja.md) | note の共有ボタン |
| [`hover-preview`](./hover-preview.ja.md) | リンク先を表示するホバープレビュー |
| [`local-graph`](./local-graph.ja.md) | 周辺ノートのミニグラフ |
| [`garden-explorer`](./garden-explorer.ja.md) | graph と検索の explorer Page Type |
| [`taxonomy`](./taxonomy.ja.md) | tag と folder の一覧 Page Type |
| [`docs`](./docs.ja.md) | Docs の sidebar と previous/next |
| [`folder-pages`](./folder-pages.ja.md) | folder ごとの index Page Type |
| [`lightbox`](./lightbox.ja.md) | 画像を拡大する操作 |
| [`diff`](./diff.ja.md) / [`changelog`](./changelog.ja.md) | note ごとの git history |
| [`l10n`](./l10n.ja.md) | 翻訳ページ上の language switcher |
| [`color-mode`](./color-mode.ja.md) | light / dark / system の切り替え |

## ビルド時・メタデータに作用する Plugin

本文には現れず、生成物や head、リダイレクトとして結果が出る Plugin です。一部は opt-in でこのサイトでは有効になっていません。表には生成されるものを記載しています。

| Plugin | 生成されるもの |
| --- | --- |
| [`seo`](./seo.ja.md) | sitemap.xml / robots.txt / feed / head の canonical と OGP |
| [`citations`](./citations.ja.md) | 番号付き引用と References セクション |
| [`webmention`](./webmention.ja.md) | webmentions.json と送受信のエンドポイント |
| [`alias`](./alias.ja.md) | 別名からのリダイレクト |
| [`series`](./series.ja.md) | `series` frontmatter による前後ナビと一覧ページ |
| [`recent-posts`](./recent-posts.ja.md) | 最新記事の一覧（Site が配置） |
| [`daily-notes`](./daily-notes.ja.md) | デイリーノートの短いスニペット（Site が配置） |
| [`rename`](./rename.ja.md) | 旧パスからのリダイレクト |
| [`deploy`](./deploy.ja.md) | 各ホスト向けのデプロイ設定ファイル |
| [`diagnostics`](./diagnostics.ja.md) | 孤立ノートや未使用アセットの診断 |
| [`quality`](./quality.ja.md) | 見出し順や重複 id などの品質チェック |
| [`hard-breaks`](./hard-breaks.ja.md) | ソフト改行をビルド時に `<br>` へ変換（opt-in） |
| [`mermaid`](./mermaid.ja.md) | headless browser によるビルド時 SVG（このサイトは Mermaid (Pele) を使用） |
| [`permalink`](./permalink.ja.md) | frontmatter の ID から安定した公開 URL とリダイレクトを生成 |
| [`analytics`](./analytics.ja.md) | collector の設定とクライアント側のイベント送信 |
| [`discord-embed`](./discord-embed.ja.md) | Discord のリンクプレビュー用メタデータ |
| [`image-optimizer`](./image-optimizer.ja.md) | Responsive Image が使う WebP / AVIF 派生画像 |
| [`svg-optimizer`](./svg-optimizer.ja.md) | 同じパスで置き換える最適化済み SVG |

実際の例は[プラグイン作成の詳細](/series/plugins-in-depth-ja)を参照してください。

## 開発ツール

これらは描画ではなく作成を支援する Plugin です。

| Plugin | できること |
| --- | --- |
| [`generator`](./generator.ja.md) | `riebeckite create plugin` でローカル Plugin を作成 |
| [`page-type-generator`](./page-type-generator.ja.md) | Plugin の `pageTypes` API 経由で単独ページを作成 |
| [`component-generator`](./component-generator.ja.md) | 型付き Hono JSX コンポーネントを作成 |

## 関連

- [[plugins/README|Plugin catalog]]
- [[writing-a-plugin|Writing a Plugin]]
- [[plugin-api|Plugin API]]
