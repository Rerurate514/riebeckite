---
title: Localization
sidebar:
  hidden: true
---

# Localization

1つのサイトで複数の言語のコンテンツを配信できるようにするl10n Pluginです。ノートの言語を検出し、翻訳をまとめ、言語切り替えを公開します。

## 言語の検出

1. frontmatterの`lang` field。
2. 設定したdetect関数。
3. `.ja.md`のようなファイル名の接尾辞。
4. 設定した既定言語。

## 追加するもの

- ノートの各言語版をtranslationとしてまとめます。
- language switcherを公開します。
- 既定以外の言語を`/ja/`のようにURLへ付けます。
