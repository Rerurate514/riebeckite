---
date: 2026-10-08
title: Riebeckite をアップグレードする
---
# Riebeckite をアップグレードする

既存のサイトを新しい Riebeckite に更新するときの手順です。

1. インストール済みのパッケージを確認する
2. サイトが利用する Riebeckite のパッケージをまとめて更新する
3. 検証とビルドを実行する
4. 対象バージョンの[リリースノート](https://riebeckite.dev/ja/docs/releases)または [GitHub Releases](https://github.com/Rerurate514/riebeckite/releases)を確認する

```sh
npm ls @riebeckite/core @riebeckite/cli @riebeckite/honox
npm exec riebeckite check
npm exec riebeckite doctor
npm exec riebeckite build
```

`check` は設定と[[glossary/plugin|プラグイン]]の取り決めを検証します。`doctor` は実行環境、プロジェクトの検出、設定、プラグイン、[[glossary/content-source|コンテンツソース]]、[[glossary/build-state|ビルド状態]]を診断します。`build` はサイトを生成できるかを確認します。

## 互換性に関する方針

Riebeckite は、非推奨の公開 API を API ライフサイクルのメタデータに記録し、TypeScript の宣言には `@deprecated` を付けます。`check`、`doctor`、Development Inspector の API タブは、プロジェクトがまだ使っている非推奨の設定キーやプラグインオプションを、代替 API、削除バージョン、移行ガイドとともに報告します。これは移行方法を示す警告であり、互換レイヤーを追加するものではなく、既定ではビルドを失敗させません。CI で失敗として扱いたい場合は `doctor --fail-on warning` を使います。

使用検出は、設定パスまたはプラグインオプションを指定したライフサイクルのメタデータに限られます。そのメタデータがない非推奨 API も `inspect api` とインスペクターには表示されますが、使用中としては報告されません。

破壊的変更は、バージョン、変更履歴、ライフサイクルのメタデータ、必要に応じて移行ガイドで案内します。この方針は、すべての削除の前に非推奨期間を必須とするものではありません。

1.0 より前は、マイナーリリースに破壊的変更が含まれることがあります。1.0 以降はセマンティックバージョニングに従います。マイナーまたはメジャーバージョンをまたいで更新するときは、[リリースノート](https://riebeckite.dev/ja/docs/releases)を確認してください。

## 更新に失敗したとき

失敗したコマンドの診断から確認します。パッケージのバージョンを確認し、対象バージョンのリリースノートに従って対象の設定またはプラグインの取り決めを更新してから、`check`、`doctor`、`build` を再実行してください。更新前の状態をバージョン管理に残しておくと、差分の確認や安全な切り戻しができます。
