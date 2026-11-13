---
title: ナレッジとデータ
showcase_progress: 4
showcase_priority: low
---
# ナレッジとデータ

## Citations：[`citations`](../citations.ja.md)

インライン引用は番号付きリンクになり、ページ末尾に References セクションが追加されます。

### ソース

````md
Riebeckite は Markdown[@gruber2004] を基盤にし、独自の Plugin モデルを備えています。[@riebeckite2026]

複数の出典をまとめて引用できます。[@riebeckite2026; @gruber2004]
````

### 実行例

Riebeckite は Markdown[@gruber2004] を基盤にし、独自の Plugin モデルを備えています。[@riebeckite2026]

複数の出典をまとめて引用できます。[@riebeckite2026; @gruber2004]

## Dataview：[`dataview`](../dataview.ja.md)

### ソース

````md
```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```
````

### 実行例

```dataview
TABLE file.name AS "Name", status
FROM #project
WHERE status = "active"
SORT file.name asc
LIMIT 10
```

## Query：[`query`](../query.ja.md)

### ソース

````md
```query
sort:
  field: title
  order: asc
limit: 5
```
````

### 実行例

```query
sort:
  field: title
  order: asc
limit: 5
```

## Bases：[`bases`](../bases.ja.md)

### ソース

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

### 実行例

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

## Meta Bind：[`meta-bind`](../meta-bind.ja.md)

インライン入力とビューはページローカルの状態を使います。初期値はフロントマターから読み込みます。

### ソース

````md
進捗：`INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

2 倍の進捗：`VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```
````

### 実行例

進捗：`INPUT[slider(minValue(0), maxValue(10), stepSize(1)):showcase_progress]`

2 倍の進捗：`VIEW[{showcase_progress} * 2]`

```meta-bind
INPUT[select(option(low), option(medium), option(high)):showcase_priority]
VIEW[{showcase_priority}]
```

## Vault ヒートマップ：[`vault-heatmap`](../vault-heatmap.ja.md)

`vault-heatmap` ブロックは公開対象コンテンツの `created`（なければ `date` / `published`）、`modified`、`updated` をカレンダーに集計します。下書き、予約投稿、unlisted のノートは除外されます。

### ソース

````md
```vault-heatmap
---
weeks: 26
title: ドキュメントの更新状況
weekStart: monday
---
```
````

### 表示

```vault-heatmap
---
weeks: 26
title: ドキュメントの更新状況
weekStart: monday
---
```

## Kanban boards：[`kanban`](../kanban.ja.md)

本文に `##` 見出しの列と task list を置くと board になります。

### ソース

````md
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
````

### 実行例

```kanban
## Backlog

- [ ] Draft the release notes
- [ ] Link to [[README]]

## Done

- [x] Publish the fixture
```

## Flashcards：[`flashcards`](../flashcards.ja.md)

`front :: back` を並べた `flashcards` フェンスが学習用のデッキになります。JavaScript が無効な環境でも静的なリストとして読めます。

### ソース

````md
```flashcards
Riebeckite とは？ :: Markdown から静的サイトを作るツール

公開の単位は？ :: Note
```
````

### 実行例

```flashcards
Riebeckite とは？ :: Markdown から静的サイトを作るツール

公開の単位は？ :: Note
```

## ExcaliBrain：[`excalibrain`](../excalibrain.ja.md)

ノートごとの関係を 7 つの領域に分けて表示します。`excalibrain` フェンスの中身は読みません。フェンスは「ここに描画する」位置を決めるだけで、マップの中身はそのページ自身のリンクから組み立てます。

### ソース

````md
```excalibrain
```
````

### 実行例

```excalibrain
```

上のマップには、このページの WikiLink から推論した関係が入ります。各 Plugin ページへは Markdown の相対リンクを使っているため、`child` に入るのは WikiLink で指定したページだけです。`parent` にはこのページへ WikiLink でリンクしているページが、`sibling` には `parent` が WikiLink でリンクしているページが並びます。
