---
title: Config
sidebar:
  hidden: true
---

# Config

コンテンツ、公開、Plugin、Theme、cache の挙動を制御する Riebeckite の設定オブジェクトです。Build が使う前に検証し、解決します。

## 制御するもの

| 設定 | 目的 |
| --- | --- |
| `content.directory` | コンテンツを読み取る場所 |
| `content.filters.publishStrategy` | 既定の publish strategy |
| `plugins` | 実行する Plugin とその option |
| `theme` | Theme とその option |
| `cache.enabled` | Build で cache を使うか |

## 検証してから解決

生の config を検証し、Build が使う形に解決します。失敗はコンテンツを処理する前に報告するため、設定の誤りが出力を壊すことはありません。
