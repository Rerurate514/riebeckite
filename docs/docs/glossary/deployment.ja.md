---
date: 2026-10-14
title: デプロイ（Deployment）
sidebar:
  hidden: true
---

# デプロイ（Deployment）

ビルド済みのサイトを配信先へ配置する段階です。ビルドがマニフェストと生成物を用意し、インテグレーションがそれらをCloudflare Workersなどのプラットフォームにつなぎます。

## ビルドが渡すもの

- マニフェスト。
- 生成物。
- 次の増分ビルドで使うビルド状態。

## 配信先

インテグレーションが出力をプラットフォームにつなぎます。静的ホスティングはファイルを直接配信し、Workerやエッジの配信先は実行環境を通じて配信します。

## デプロイコマンド
CLIには次のデプロイ方法があります。

| 方法 | 説明 |
| --- | --- |
| `riebeckite build` | サイトをビルドし、出力を`dist/`に書き込む |
| `riebeckite deploy` | `dist/`をCloudflare Workerにデプロイする。`wrangler`と生成された`wrangler.jsonc`が必要。カスタムドメインも指定できる。 |
| `riebeckite deploy setup` | push時の自動デプロイ用のGitHub Actionsワークフローを設定する。Cloudflare APIのシークレットを登録する。 |
| `riebeckite deploy domain` | デプロイ済みのWorkerにカスタムドメインを設定する。`wrangler.jsonc`または`wrangler.toml`を更新する。 |

初回のデプロイでは、`npm exec riebeckite build`で`dist/`を生成してから、`npm exec riebeckite deploy`で公開します。カスタムドメインを設定したあとは、`riebeckite.config.ts`の`site.baseUrl`を最終的なアドレスに更新してください。生成されるURL（サイトマップ、フィード、hreflang）が最終的なアドレスを使うようになります。
