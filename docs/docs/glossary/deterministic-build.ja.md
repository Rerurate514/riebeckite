---
title: 決定的ビルド
sidebar:
  hidden: true
---

# 決定的ビルド

 同じ入力が与えられた場合、一貫した fingerprints、 pipeline versioning、 および configuration snapshots が保証されるため、同じ出力を生成するビルドです。

## 決定性の確保

 一貫したコンテンツのフィンガープリント (source、 frontmatter、 pipeline、 plugin cacheVersion)。
 pipeline fingerprint には plugin configuration と content-filter settings が含まれる。
 configuration snapshots は build state と external dependencies に記録される。

## フォールバック

 determinism が確認できない場合 (unsafe plugin、global dependency などの場合)、 full build path が取られる。
 missing または incompatible cache または state entry も full build path を引き起こす。

## 関連用語

- [[fingerprint|フィンガープリント]]
- [[build|ビルド]]
- [[check|Check]]

## さらに詳しく

- [Build System](../framework/build-system.ja.md)
