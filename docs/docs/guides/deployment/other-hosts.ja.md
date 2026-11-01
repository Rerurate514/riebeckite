---
date: 2026-11-01
title: Cloudflare 以外のホストに公開する
sidebar:
  label: Cloudflare 以外のホスト
  order: 50
---
# Cloudflare 以外のホストに公開する

`riebeckite build` は `dist/` に静的ファイルを出力します。どのホストでも、この `dist/` を配信すればサイトを公開できます。

Cloudflare 向けの `riebeckite publish run` と `deploy setup` は Cloudflare 専用です。ほかのホストでは、ビルドした `dist/` を自分でアップロードします。

## ホスト向けのファイルを生成する

[Deploy プラグイン](../../plugins/deploy.ja.md) を使うと、ホストが読むリダイレクトやヘッダーのファイルを `dist/` に含められます。

```ts
import { defineConfig } from "@riebeckite/core";
import { deploy } from "@riebeckite/plugin-deploy";

export default defineConfig({
  plugins: [
    deploy({
      provider: "netlify",
      headers: { "X-Frame-Options": "DENY" },
    }),
  ],
});
```

`provider` には次の値を指定します。

| ホスト | `provider` | 生成されるファイル |
| --- | --- | --- |
| Cloudflare Pages | `cloudflare-pages` | `_redirects`、`_headers` |
| Cloudflare Workers | `cloudflare-workers` | `_redirects`、`_headers` |
| Netlify | `netlify` | `_redirects`、`_headers` |
| Vercel | `vercel` | `vercel.json` |
| GitHub Pages | `github-pages` | `.nojekyll`、`404.html`、`CNAME`、リダイレクト用の HTML |

複数のホストを同時に指定できます。同じパスに異なる内容が出力される場合は、ビルドがエラーになります。

リダイレクトは、公開済みエントリの公開リダイレクトからだけ生成されます。非公開のノートの旧パスが混ざることはありません。ファイルの詳細は [Deploy プラグイン](../../plugins/deploy.ja.md) を参照してください。

## Netlify

1. リポジトリを Netlify に接続します。
2. ビルドコマンドを `npm run build`、公開ディレクトリを `dist` にします。
3. `deploy({ provider: "netlify" })` を設定してビルドします。

`_redirects` と `_headers` は `dist/` に含まれるため、Netlify がそのまま読み取ります。

手元から CLI で公開する場合は、ビルド後に次を実行します。

```sh
npx netlify deploy --dir=dist --prod
```

## Vercel

1. リポジトリを Vercel に接続します。
2. ビルドコマンドを `npm run build`、出力ディレクトリを `dist` にします。
3. `deploy({ provider: "vercel" })` を設定してビルドします。

リダイレクトを手書きする代わりに、ビルドで `vercel.json` を生成できます。末尾スラッシュの扱いは `trailingSlash` で指定します。

## GitHub Pages

1. `deploy({ provider: "github-pages", cname: "example.com" })` を設定します。独自ドメインを使わない場合は `cname` を省略します。
2. `npm run build` を実行します。
3. `dist/` を公開ブランチ（`gh-pages` など）へ push するか、GitHub Actions から公開します。

`dist/` には `.nojekyll` が含まれるため、Jekyll の処理を経ずに配信されます。`404.html` と、リダイレクトごとの HTML も生成されます。

GitHub Pages は `_redirects` を解釈しません。リダイレクトはメタリフレッシュを使う HTML になり、`/` からのリダイレクトは生成されません。

## 共通の注意点

- どのホストでも、`site.baseUrl` を公開 URL に合わせてからビルドします。
- `deploy()` はファイルを出力するだけで、アップロード、認証、キャッシュの削除は行いません。
- ホストのビルド設定では、必ず `dist/` を公開ディレクトリに指定します。`.riebeckite/` やプラグインのキャッシュは公開しません。
