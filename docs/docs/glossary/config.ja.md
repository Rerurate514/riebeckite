---
title: Config
sidebar:
  hidden: true
---

# Config

コンテンツ、公開、Plugin、Theme、cacheの挙動を制御するRiebeckiteの設定オブジェクトです。Buildが使う前に検証し、解決します。

## 制御するもの

| 設定 | 目的 |
| --- | --- |
| `content.directory` | コンテンツを読み取る場所 |
| `content.filters.publishStrategy` | 既定のpublish strategy |
| `plugins` | 実行するPluginとそのoption |
| `theme` | Themeとそのoption |
| `cache.enabled` | Buildでcacheを使うか |

## 検証してから解決

生のconfigを検証し、Buildが使う形に解決します。失敗はコンテンツを処理する前に報告するため、設定の誤りが出力を壊すことはありません。
