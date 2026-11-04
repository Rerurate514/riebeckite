---
date: 2026-10-14
title: デプロイ（Deployment）
sidebar:
  hidden: true
---

# デプロイ（Deployment）

ビルド済みのサイトを配信先へ配置する段階です。ビルドがマニフェストと生成物を用意し、インテグレーションがそれらを Cloudflare Workers などのプラットフォームにつなぎます。

## ビルドが渡すもの

- マニフェスト。
- 生成物。
- 次の増分ビルドで使うビルド状態。

## 配信先

インテグレーションが出力をプラットフォームにつなぎます。静的ホスティングはファイルを直接配信し、Worker やエッジの配信先は実行環境を通じて配信します。

## デプロイコマンド
CLI には次のデプロイ方法があります。

| 方法 | 説明 |
| --- | --- |
| `riebeckite build` | サイトをビルドし、出力を `dist/` に書き込む |
| `riebeckite publish run --execute` | `dist/` を Cloudflare Worker にデプロイする。`wrangler` と生成された `wrangler.jsonc` が必要。カスタムドメインも指定できる。 |
| `riebeckite deploy setup` | push 時の自動デプロイ用の GitHub Actions ワークフローを設定する。Cloudflare API のシークレットを登録する。 |
| `riebeckite deploy domain` | 確認後にデプロイ済みの Worker へ Custom Domain を追加する（`wrangler.jsonc` または `wrangler.json`）。続けてデプロイするか尋ねる。`wrangler.toml` は変更せず、手動編集に任せる。 |

初回のデプロイでは、`npm exec riebeckite build` で `dist/` を生成してから、`npm exec -- riebeckite publish run --execute` で公開します。カスタムドメインを設定したあとは、`riebeckite.config.ts` の `site.baseUrl` を最終的なアドレスに更新してください。生成される URL（サイトマップ、フィード、hreflang）が最終的なアドレスを使うようになります。
