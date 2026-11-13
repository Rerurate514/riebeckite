---
title: Obsidian Markdown
---
# Obsidian Markdown

## Callouts：[`obsidian-markdown`](../obsidian-markdown.ja.md)

### ソース

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

### 実行例

> [!tip] 試してみる
> Callout は `[!type]` マーカー付きの block quote です。

> [!info] 情報
> 情報用の callout も同じ書き方です。

> [!warning] 警告
> 警告は追加設定なしで使えます。

> [!question] 質問
> 未解決の論点には question を使います。

## WikiLinks と埋め込み：[`obsidian-markdown`](../obsidian-markdown.ja.md)

### ソース

````md
[[README]] と [[plugins/README|Plugin catalog]] への WikiLink。

ノートの埋め込み：

![[head-tag]]

画像の埋め込み：

![[riebeckite-logo-horizontal.png]]
````

### 実行例

[[README]] と [[plugins/README|Plugin catalog]] への WikiLink。

ノートの埋め込み：

![[head-tag]]

画像の埋め込み：

![[riebeckite-logo-horizontal.png]]

ブロック参照 `![[head-tag#^block]]` は、対象ノートにブロック ID がある場合に使えます。

## Hard breaks：[`hard-breaks`](../hard-breaks.ja.md)

`hardBreaks()` は単一の改行をすべて `<br>` に変換します。opt-in のプラグインであり、このサイトでは有効にしていないため、次の 3 行は 1 つの段落として表示されます。

### ソース

````md
1 行目
2 行目
3 行目
````

### 実行例

1 行目
2 行目
3 行目

有効にすると各行が独立した行になります。
