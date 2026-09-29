# @riebeckite/plugin-deploy

Riebeckite の静的ホスティング向け出力ヘルパーです。デプロイ先が必要とする
ファイルを組み立て、ビルドの generated-output シンク経由で出力します。
アップロードは行わず、ファイルシステムにも書き込みません。

[English](./README.md)

## 概要

`deployPlugin()` はコンテンツマニフェストの公開リダイレクトを読み、
Cloudflare Pages / Netlify / Vercel / GitHub Pages 向けのファイルを計画します。
計画は純粋かつ決定的です。タイムスタンプや乱数は使わず、パスの順序も安定します。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { deployPlugin } from "@riebeckite/plugin-deploy";

export default defineConfig({
  plugins: [
    deployPlugin({
      provider: ["cloudflare-pages", "github-pages"],
      baseUrl: "https://example.com",
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
| `cloudflare-pages`, `netlify` | `_redirects`（リダイレクトがある場合）、`_headers`（ヘッダー設定時） |
| `vercel` | `vercel.json` |
| `github-pages` | `.nojekyll`、`404.html`、`CNAME`（設定時）、リダイレクトごとの `<from>/index.html` メタリフレッシュ |

GitHub Pages には `_redirects` 構文がないため、各リダイレクトはメタリフレッシュと
`<link rel="canonical">` を持つ HTML スタブになります。`/` からのリダイレクトは
ルートをスタブ化できないためスキップします。

## 公開 API

- `deployPlugin(options: DeployOptions): RiebeckitePlugin`
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

## ????

- [?????????](../../../docs/ja/plugin-system.md)
