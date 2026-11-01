---
date: 2026-10-08
title: Riebeckite をアップグレードする
---
# Riebeckite をアップグレードする

既存のサイトを新しい Riebeckite に更新するときの手順です。

1. インストール済みのパッケージを確認する
2. サイトが利用する Riebeckite のパッケージをまとめて更新する
3. 検証とビルドを実行する
4. 対象バージョンの[リリースノート](https://github.com/Rerurate514/riebeckite/releases)を確認する

```sh
npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` は設定と[[glossary/plugin|プラグイン]]の取り決めを検証します。`doctor` は実行環境、プロジェクトの検出、設定、プラグイン、[[glossary/content-source|コンテンツソース]]、[[glossary/build-state|ビルド状態]]を診断します。`build` はサイトを生成できるかを確認します。

## 互換性に関する方針

現在の Riebeckite は、非推奨 API に対する実行時の警告や互換レイヤーを標準では提供していません。破壊的変更は、バージョン、変更履歴、必要に応じて移行ガイドで案内します。この方針は、将来のリリースで非推奨期間を設けることを妨げるものではありません。

1.0 より前は、マイナーリリースに破壊的変更が含まれることがあります。1.0 以降はセマンティックバージョニングに従います。マイナーまたはメジャーバージョンをまたいで更新するときは、[リリースノート](https://github.com/Rerurate514/riebeckite/releases)を確認してください。

## 更新に失敗したとき

失敗したコマンドの診断から確認します。パッケージのバージョンを確認し、対象バージョンのリリースノートに従って対象の設定またはプラグインの取り決めを更新してから、`check`、`doctor`、`build` を再実行してください。更新前の状態をバージョン管理に残しておくと、差分の確認や安全な切り戻しができます。
