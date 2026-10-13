---
title: Build Dependency
sidebar:
  hidden: true
---

# Build Dependency

あるコンテンツや出力に影響する入力の宣言で、別のノート、ファイル、tag、folderなどがあります。依存を記録することで、Coreは変化が影響し得る分だけを無効化できます。

## 依存の種類

content（slug）、file（sourceのパス）、link（解決済みのリンク）、global（設定の変更）、projection（taxonomyやrecent-posts）、tag、folderを扱います。

## 無効化

宣言した入力が変わると、Coreは依存するコンテンツだけを無効化し、無関係な部分の再処理を避けます。

## 関連用語

- [[cache-invalidation|Cache Invalidation]]
- [[output-dependency|Output Dependency]]
- [[fingerprint|Fingerprint]]
- [[plugin-dependency|Plugin dependency]]

## さらに詳しく

- [Build Dependency](../framework/build-dependency.ja.md)
