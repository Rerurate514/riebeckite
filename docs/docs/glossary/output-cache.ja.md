---
title: 出力キャッシュ
sidebar:
  hidden: true
---

# 出力キャッシュ

 `.riebeckite/ssg-output-cache.json` に保存された、SSG の出力ルートとファイルを格納したキャッシュです。 incremental SSG の再利用のために local-only で、CI runner 間で共有することを目的としていない。

## 目的

 現在の manifest をビルドした後、Core は出力記述子を以前の成功した状態と比較する。
 HonoX は affected コンテンツと plugin-page ルートだけを描画し、 unchanged generated output から出力キャッシュから復元し、サイトが所有しなくなった出力を削除する。

## local-only

 output cache は転送コストがメリットを上回るため local に留められる。
 `.riebeckite/build/content-state.json` と `.riebeckite/ssg-output-cache.json` を削除して full output regeneration を強制する。

## 関連用語

- [[ssg|SSG]]
- [[output-inventory|出力インベントリ]]
- [[glossary/cache|Cache]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
