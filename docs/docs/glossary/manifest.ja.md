---
title: Manifest
sidebar:
  hidden: true
---

# Manifest

すべてのコンテンツを記録するビルド時の一覧です。entry、公開ビュー、検索用の対応表、content graph、diagnosticを持ちます。ページ生成、実行時のquery、incremental build、inspectionはいずれもmanifestを読みます。

## manifestが持つもの

| field | 内容 |
| --- | --- |
| `entries` | 処理済みのすべてのContent Entry |
| `publicEntries` | 公開して安全なentry |
| `discoverableEntries` | 一覧やfeedに載せてよいentry |
| `bySlug`, `byPermalink`, `byAlias` | 検索用の対応表 |
| `graph` | content graph |
| `diagnostics` | 集めた警告とエラー |

## 段階を分ける境界

コンテンツ処理がmanifestを作り、ページ生成、実行時のquery、incremental build、inspectionがそれを読みます。後段がファイルシステムに触れる必要はありません。
