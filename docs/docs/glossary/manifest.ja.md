---
title: Manifest
sidebar:
  hidden: true
---

# Manifest

すべてのコンテンツを記録するビルド時の一覧です。entry、公開ビュー、検索用の対応表、content graph、diagnostic を持ちます。ページ生成、実行時の query、incremental build、inspection はいずれも manifest を読みます。

## manifest が持つもの

| field | 内容 |
| --- | --- |
| `entries` | 処理済みのすべての Content Entry |
| `publicEntries` | 公開して安全な entry |
| `discoverableEntries` | 一覧や feed に載せてよい entry |
| `bySlug`, `byPermalink`, `byAlias` | 検索用の対応表 |
| `graph` | content graph |
| `diagnostics` | 集めた警告とエラー |

## 段階を分ける境界

コンテンツ処理が manifest を作り、ページ生成、実行時の query、incremental build、inspection がそれを読みます。後段がファイルシステムに触れる必要はありません。
