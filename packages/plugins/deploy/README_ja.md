# @riebeckite/plugin-deploy

<!-- Generated from docs/docs/plugins/deploy.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Riebeckite の静的ホスティング向けの出力ヘルパーです。デプロイ先に必要なファイルを組み立て、ビルドの生成出力シンクへ渡します。
アップロードは行わず、ファイルシステムにも書き込みません。

[English](./README.md)

## できること

- `riebeckite build` の実行中に、プロバイダ固有のリダイレクトファイルとヘッダーファイルを生成します。
- リダイレクトは `manifest.publicRedirects` からのみ読み取ります。
- Cloudflare Pages、Cloudflare Workers、Netlify、Vercel、GitHub Pages に対応します。

## できないこと

- ファイルのアップロード、プロバイダ認証、キャッシュ無効化は行いません。
- サイトをデプロイしません。ビルド出力をプロバイダの通常のデプロイ手順でアップロードするか、設定済みなら公開ワークフローの `publish run --execute` を使ってください。
- `riebeckite deploy setup` は Cloudflare の設定を準備する別の CLI ヘルパーです。これもアップロードは行いません。

## 概要

`deploy()` はコンテンツマニフェストの公開リダイレクトを読み、
Cloudflare Pages / Cloudflare Workers / Netlify / Vercel / GitHub Pages 向けの
ファイルを計画します。出力計画は純粋かつ決定的です。タイムスタンプや乱数は使わず、
パスの順序も安定します。

## インストール

```sh
npm install @riebeckite/plugin-deploy
```

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { deploy } from "@riebeckite/plugin-deploy";

export default defineConfig({
  plugins: [
    deploy({
      provider: ["cloudflare-workers", "github-pages"],
      cname: "example.com",
      headers: { "X-Frame-Options": "DENY" },
    }),
  ],
});
```

リダイレクトは `manifest.publicRedirects` からのみ読み取ります。非公開ノートの
旧パスがデプロイファイルに漏れることはありません。遷移先の slug が見つからない
リダイレクトはスキップし、`deploy-unresolved-redirect` の診断を出します。

## プロバイダごとの出力

| プロバイダ | ファイル |
| --- | --- |
| `cloudflare-pages`, `cloudflare-workers`, `netlify` | `_redirects`（リダイレクトがある場合）、`_headers`（ヘッダー設定時） |
| `vercel` | `vercel.json` |
| `github-pages` | `.nojekyll`、`404.html`、`CNAME`（設定時）、リダイレクトごとの `<from>/index.html` メタリフレッシュ |

`cloudflare-workers` は `cloudflare-pages` と同じファイルを出力します。Workers
Static Assets が `_redirects` と `_headers` の両方を読むためです。ただし Cloudflare
は `_redirects` を静的アセットのレスポンスにのみ適用し、Worker コードが返す
レスポンスには適用しません。

GitHub Pages には `_redirects` 構文がないため、各リダイレクトはメタリフレッシュと
`<link rel="canonical">` を持つ HTML スタブになります。`/` からのリダイレクトは
ルートをスタブ化できないためスキップします。

## 生成したファイルのデプロイ

通常どおりビルドします。

```sh
npm exec riebeckite build
```

ファイルはビルド出力（たとえば `dist/_redirects`）へ書き込まれます。そのディレクトリをプロバイダのデプロイ手順でアップロードしてください。このプラグインはファイル生成までを担当し、認証情報を持たず、アップロードも行いません。

サイトが公開ワークフローを使っている場合、`publish run --execute` が設定済みの公開処理を実行します。`deploy setup` は Cloudflare の設定を準備するだけです。

## 公開 API

- `deploy(options: DeployOptions): RiebeckitePlugin`
- `planDeployOutputs({ provider, redirects, options }): DeployOutput[]`
- `renderRedirectLines(redirects): string`
- `renderVercelConfig({ redirects, options }): string`
- `renderRedirectStub(redirect): string`

## 注意点

- 複数プロバイダの出力は統合されます。同一ファイルは 1 つにまとまり、同じパスに
  異なる内容が来た場合はエラーになります。
- リダイレクトの `from` は出力パスにする前に `.` と `..` を解決し、すべてのパスが
  `normalizeGeneratedOutputPath` を通ります。
- アップロード、キャッシュ無効化、プロバイダ認証は対象外です。

## 関連リンク

- [プラグイン API](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
