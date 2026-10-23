---
title: Riebeckite
description: Markdown や Obsidian のノートから、拡張できる Web サイトを作るオープンソースフレームワークです。
translation: home
homepage: true
---

# Riebeckite

Riebeckite は、Markdown や Obsidian 形式のノートを静的サイトとして公開するフレームワークです。`content/` に記事を書き、検索・図・多言語化などのプラグインを追加し、テーマを選んでビルドすると、どこにでも配置できる静的サイトができます。

初めての場合は [はじめに](./docs/getting-started/README.ja.md) から読み進めてください。すべての章を一覧したい場合は [ドキュメント一覧](./docs/README.ja.md) を参照してください。

最初のサイトは、**クイックスタート → インストール → 最初のコンテンツ → プリセット → デプロイ** の順に作ります。

## やりたいことから探す

| やりたいこと | 参照先 |
| --- | --- |
| 初めて Riebeckite を使う | [クイックスタート](./docs/getting-started/quick-start.ja.md) |
| 今日中にサイトを作って公開する | [クイックスタート](./docs/getting-started/quick-start.ja.md) → [デプロイ](./docs/getting-started/deployment.ja.md) |
| `create-riebeckite` のプリセットを選ぶ | [プリセット](./docs/getting-started/presets.ja.md) |
| 記事を書いて整理する | [ガイド / コンテンツの書き方](./docs/guides/writing-content.ja.md) |
| Obsidian の Vault を公開する | [ガイド / Obsidian](./docs/guides/obsidian.ja.md) |
| コンテンツとサイトを別リポジトリで管理する | [ガイド / コンテンツリポジトリ](./docs/guides/content-repositories.ja.md) |
| 多言語サイトを作る | [ガイド / 多言語化](./docs/guides/localization.ja.md) |
| Cloudflare Workers や GitHub Actions へデプロイする | [ガイド / デプロイ](./docs/guides/deployment/README.ja.md) |
| Riebeckite を更新する、移行メモを読む | [ガイド / アップグレード](./docs/guides/upgrading.ja.md) |
| プラグインを探して導入する | [プラグイン](./docs/plugins/README.ja.md) |
| プラグインの動作例を見る | [プラグインの動作例](./docs/plugins/showcase.ja.md) |
| サイトの見た目を変える | [テーマ](./docs/themes/README.ja.md) |
| より多くの人が使えるサイトにする | [アクセシビリティ](./docs/accessibility.ja.md) |
| セキュリティ上の前提を理解する | [セキュリティモデル](./docs/security.ja.md) |
| 設定・CLI・API を調べる | [リファレンス](./docs/reference/README.ja.md) |
| Riebeckite の内部構造を知る | [フレームワーク](./docs/framework/README.ja.md) |
| Riebeckite 自体の開発に参加する | [フレームワーク / 開発](./docs/framework/development.ja.md) |

## 次に読む章

- **はじめに** — インストール、プリセット、最初のコンテンツ、デプロイ。フレームワークの内部には触れません。
- **ガイド** — 目的別の手順です。コンテンツの書き方、Obsidian、コンテンツリポジトリ、多言語化、デプロイ、アクセス解析、アップグレードを扱います。
- **プラグイン** — 一覧、動作例、独自プラグインの作り方。
- **テーマ** — 一覧と独自テーマの作り方。
- **アクセシビリティ** — Riebeckite が既定で対応していることと、テーマ・プラグイン・コンテンツ作成者が維持すべきこと。
- **セキュリティモデル** — 信頼するコンテンツ、プラグインが生成する HTML、エンドポイント、外部プロバイダーとの境界。
- **リファレンス** — 設定項目、CLI、プラグイン API、テーマ API。
- **フレームワーク** — アーキテクチャ、コンテンツシステム、プラグインとテーマの仕組み、ビルドシステム、HonoX との統合、診断、テスト、リポジトリの開発。

## 最初のサイトの構成

```text
my-site/
├─ content/              Markdown のページとアセット
├─ app/                  プリセットが生成するサイト UI
├─ riebeckite.config.ts  サイト名、URL、テーマ、プラグイン
└─ package.json          ローカルのコマンド
```

サイト作成者が主に編集するのは `content/` と `riebeckite.config.ts` です。内部のアーキテクチャは [フレームワーク](./docs/framework/README.ja.md) で説明しています。

コーディングエージェントや自動化向けには、簡潔なルール集である [エージェント向けドキュメント](./agents/README.md) を用意しています。
