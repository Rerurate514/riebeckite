# Cloudflare デプロイテンプレート

Riebeckite サイト向けの、[GitHub Actions](https://docs.github.com/actions) と Cloudflare Workers Static Assets の標準構成です。ファイルをサイトのリポジトリへコピーすると、push のたびにビルドして生成物をデプロイできます。

[English](./README_en.md)

## 含まれるもの

| ファイル | 役割 |
| --- | --- |
| `wrangler.jsonc` | Worker 名、互換設定、静的アセットのディレクトリ（`./dist`） |
| `.github/workflows/deploy.yml` | `main` への push（または手動実行）で check、build、deploy を行う |

## 前提

- `build` スクリプトを持つ動作中の Riebeckite サイト。参照用アプリケーションと [external-site フィクスチャ](../../tests/external-site/README.md) はどちらも `riebeckite build` を使い、Vite の出力を `dist/` へ書き出します。
- サイトの `package.json` の `packageManager` で `pnpm` を宣言していること。CI で Corepack が pnpm を用意します。
- Workers を有効にした Cloudflare アカウント。

## テンプレートの適用

1. `wrangler.jsonc` をサイトのルートにコピーし、`name` を一意の Worker 名に変更します。
2. `.github/workflows/deploy.yml` をサイトのリポジトリの同じパス（`.github/workflows/deploy.yml`）へコピーします。
3. **Workers Scripts: Edit** 権限を持つ Cloudflare API トークンを作成し、リポジトリのシークレットに次を追加します。
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. `main` へ push するか、Actions タブからワークフローを手動実行します。

## ローカルでの確認

デプロイせずにビルドと設定を確認できます。

```sh
pnpm install
pnpm run build
pnpm exec wrangler deploy --dry-run
```

`wrangler deploy --dry-run` は Cloudflare に接続せず、`wrangler.jsonc` とアセットディレクトリを検証します。`pnpm exec wrangler dev` を使うと同じ出力をローカルで配信できます。

## ワークフローの流れ

1. リポジトリをチェックアウトし、Corepack を有効化する。
2. `pnpm install --frozen-lockfile` で依存をインストールする。
3. `pnpm run check` で設定と Plugin を読み取り専用で検証する。
4. `pnpm run build` で `dist/` を生成する。
5. リポジトリのシークレットを使って `cloudflare/wrangler-action` でデプロイする。

## 補足

- **静的アセットで足ります。** Riebeckite はビルド時にコンテンツのルートと Plugin のエンドポイントを事前生成するため、生成された `dist/` は runtime の `main` なしで静的アセットとしてデプロイされます。参照用アプリケーションも `apps/web/wrangler.jsonc` で同じ形を使っています。
- **ビルド状態はビルド時に留まります。** `.riebeckite/` と Plugin cache は `dist/` に含まれず、Worker runtime へは渡りません。
- **添付ファイルはサイトが管理します。** 公開するファイルだけを、参照用アプリケーションのようにビルド前の `prebuild` 手順でコピーしてください。

## 関連資料

- [利用ガイド — プレビューとデプロイ](../../docs/ja/guide.md#7-プレビューとデプロイ)
- [HonoX Integration](../../docs/ja/honox-integration.md)
- [Build System](../../docs/ja/build-system.md)
