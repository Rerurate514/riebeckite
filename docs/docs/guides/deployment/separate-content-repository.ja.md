---
date: 2026-10-08
title: コンテンツリポジトリの分離
sidebar.label: コンテンツリポジトリ分離
aliases:
  - /ja/docs/guides/content-repositories
---
# コンテンツリポジトリの分離

記事（Markdown/Obsidian Vault）をサイト（コード、設定、テーマ）から別々に管理する方法を説明します。

## できること

- 記事を非公開のままサイトを公開する
- 複数のサイトで1つのVaultを共有する
- 記事の更新とサイトのデプロイを分離する
- 記事とサイトの更新を独立して管理する

## 向いている場面

| 状況 | おすすめ |
|---|---|
| 記事を公開したくない | リポジトリ分離型。プライベートリポジトリにすればソースリポジトリは非公開のままですが、`publish: true` があるノートは公開サイトに載るため、非公開にしたいノートは `publish: true` を外し、`content.exclude` で非公開フォルダを除外してください。 |
| 記事もサイトも公開してよい | 一体型またはディレクトリ分離型。管理するリポジトリは1つで済みます。 |
| 記事を更新したらサイトもデプロイしたい | リポジトリ分離型。記事の push でデプロイを起動するには、外部チェックアウトに加えて repository dispatch が必要です。単なるチェックアウトのみでは、すでに起動しているデプロイにファイルを供給するだけです。 |
| 1つの Vault を複数のサイトで使いたい | リポジトリ分離型、または Vault を独立した場所に置き、各サイトから参照します。 |

## ページガイド

- [概念](./separate-content-repository/concepts.ja.md) — リポジトリ分離の概念、用語、レイアウト判断
- [セットアップ](./separate-content-repository/setup.ja.md) — content-repositories と repository-split を統合した手順。シークレット名・権限設定・トークン発行の重複手順を1本化し、手順通り読める構成にしています。
- [公開とトラブルシューティング](./separate-content-repository/publishing.ja.md) — 公開ルールと検証。トラブルシューティング表は専用ページを参照しています。
- [トラブルシューティング](./separate-content-repository/troubleshooting.ja.md) — 統合されたトラブルシューティング表。よくある問題を1か所で完結できます。