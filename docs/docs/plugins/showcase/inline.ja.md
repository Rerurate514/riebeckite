---
title: インライン表現
---
# インライン表現

## Highlight：[`highlight`](../highlight.ja.md)

`==text==` で囲んだ範囲をインラインで強調します。

### ソース

````md
この文は ==強調== され、ほかはそのまま表示されます。
````

### 実行例

この文は ==強調== され、ほかはそのまま表示されます。

## Sidenotes：[`sidenotes`](../sidenotes.ja.md)

脚注記法は、本文の横に並ぶ補足に変換されます。

### ソース

````md
本文中で補足を参照します。[^1]

[^1]: ここが sidenote の本文です。
````

### 実行例

本文中で補足を参照します。[^1]

[^1]: ここが sidenote の本文です。

## Shortcodes：[`shortcodes`](../shortcodes.ja.md)

`::name` と `:::name` のディレクティブで、badge、kbd、note などを差し込みます。

### ソース

````md
::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[補足]
本文をそのまま書けます。
:::
````

### 実行例

::badge[Stable]{variant=success}

::kbd[Ctrl+Shift+P]

:::note[補足]
本文をそのまま書けます。
:::
