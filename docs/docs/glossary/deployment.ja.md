---
title: Deployment
sidebar:
  hidden: true
---

# Deployment

Build済みのサイトを配信先へ配置する段階です。Buildがmanifestと生成物を用意し、IntegrationがそれをCloudflare Workersなどのplatformにつなぎます。

## Buildが渡すもの

- manifest。
- generated output。
- 次のincremental buildで使うbuild state。

## 配信先

integrationが出力をplatformにつなぎます。静的ホスティングはファイルを直接配信し、workerやedgeの配信先はruntimeを通して配信します。

## deploymentコマンド
CLIには以下のデプロイ方法があります：

| method | 説明 |
| --- | --- |
| `riebeckite build` | サイトをBuildし、出力を `dist/` に書き込みます |
| `riebeckite deploy` | `dist/` を Cloudflare Worker にデプロイします。`wrangler` と生成された `wrangler.jsonc` が必要です。custom domain も含められます |
| `riebeckite deploy setup` | 自動デプロイのためのGitHub Actions workflowを設定します。Cloudflare APIシークレットを登録します |
| `riebeckite deploy domain` | デプロイされたWorkerのcustom domainを設定します。`wrangler.jsonc` または `wrangler.toml` を更新します |

初めてデプロイする際は、`npm exec riebeckite build`で`dist/`を生成し、その後`npm exec riebeckite deploy`で公開します。custom domainを設定した後は、`site.baseUrl`を`riebeckite.config.ts`で最終的なアドレスに更新し、sitemap、feed、hreflangで生成されたURLが最終的なアドレスを使用するようにします。
