---
date: 2026-10-08
title: 変更の流れ
sidebar:
  label: 変更の流れ
  order: 20
---
# 変更の流れ

## 変更時の検証フロー

必要な検証は変更内容によって異なりますが、基本的には**小さい範囲から確認し、最後に広い範囲を確認する**進め方を推奨します。

```mermaid id="jyhjau"
flowchart TD
    Change["コードを変更"]
    Focus["対象パッケージのテスト / 型検査"]
    Related["関連するインテグレーション / アプリを確認"]
    Check["pnpm check"]
    Build["pnpm build"]

    Change --> Focus
    Focus --> Related
    Related --> Check
    Check --> Build
```

たとえばプラグインを変更した場合は、まずそのプラグインのテストを実行します。

```bash id="9dvfqe"
pnpm --filter <plugin-package> test
```

問題がなければ、必要に応じて型検査や参照アプリの確認を行い、最後にリポジトリ全体の検証を行います。変更のたびに最初から最も重いコマンドを実行する必要はありません。

## 変更する場所を選ぶ

機能を追加するときは、まず責務に合ったパッケージを選びます。

```mermaid id="ud3gdo"
flowchart TD
    Q{"何を変更する？"}

    Q -->|"共通のコンテンツ / 取り決め"| Core["packages/core"]
    Q -->|"CLI コマンド"| CLI["packages/cli"]
    Q -->|"再利用可能な機能"| Plugin["packages/plugins/*"]
    Q -->|"HonoX / Vite との接続"| Integration["packages/integrations/honox"]
    Q -->|"見た目 / CSS"| Theme["packages/themes/*"]
    Q -->|"ルート / アイランド / サイト UI"| App["apps/web"]
    Q -->|"サイト生成"| Scaffold["create-riebeckite / scaffold"]
```

判断に迷う場合は、[Architecture](../architecture.ja.md) の責務分離を基準にしてください。

## パッケージの境界

フレームワークを変更するときは、パッケージ間の依存方向を維持してください。大まかな依存関係は次のとおりです。

```mermaid id="osmqrm"
flowchart BT
    App["アプリケーション"]
    Integration["インテグレーション"]
    Plugin["プラグイン"]
    Theme["テーマ"]
    CLI["CLI"]
    Core["Core"]

    App --> Integration
    Integration --> Core
    Plugin --> Core
    Theme --> Core
    CLI --> Core
    CLI --> Integration
```

特に重要なのは、Core から外側への逆依存を作らないことです。たとえば、Core を次のような具体的な実装に依存させてはいけません。

```text id="7nxphg"
apps/web
packages/plugins/*
HonoX
Vite
```

フレームワークに依存しない取り決めは Core に置き、その取り決めをインテグレーションやプラグインが利用します。
