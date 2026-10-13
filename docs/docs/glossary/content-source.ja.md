---
title: Content Source
sidebar:
  hidden: true
---

# Content Source

パイプラインの他の部分にコンテンツを供給する読み取りの抽象です。標準の実装はファイルシステムや Obsidian vault を読み取るため、Content Manager がファイルシステムを直接走査することはありません。

## 役割

- 場所を走査し、Content Manager にコンテンツの entry を渡します。
- コンテンツの取得を、処理や公開位置の解決から切り離します。

## 関連用語

- [[content-manager|Content Manager]]
- [[content-entry|Content Entry]]
- [[root|Root]]

## さらに詳しく

- [Content System](../framework/content-system.ja.md)
