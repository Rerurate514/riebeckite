---
title: Localization
sidebar:
  hidden: true
---

# Localization

1 つのサイトで複数の言語のコンテンツを配信できるようにする l10n Plugin です。ノートの言語を検出し、翻訳をまとめ、言語切り替えを公開します。

## 言語の検出

1. frontmatter の `lang` field。
2. 設定した detect 関数。
3. `.ja.md` のようなファイル名の接尾辞。
4. 設定した既定言語。

## 追加するもの

- ノートの各言語版を translation としてまとめます。
- language switcher を公開します。
- 既定以外の言語を `/ja/` のように URL へ付けます。
