# Cloudflare デプロイテンプレート

Riebeckite サイト向けの、[GitHub Actions](https://docs.github.com/actions) と Cloudflare Workers Static Assets の標準構成です。ファイルをサイトのリポジトリへコピーすると、push のたびにビルドして生成物をデプロイできます。

[English](./README_en.md)

## 含まれるもの

| ファイル | 役割 |
| --- | --- |
| `wrangler.jsonc` | Worker 名、互換設定、静的アセットのディレクトリ（`./dist`） |
| `.github/workflows/deploy.yml` | `main` への push、手動実行、`content-updated` の repository dispatch で check、build、deploy を行う |
| `notify-site.yml` | 別記事リポジトリに `.github/workflows/notify-site.yml` として置き、記事 push 後に site へ通知する |

## 前提

- `build` スクリプトを持つ動作中の Riebeckite サイト。参照用アプリケーションと [external-site フィクスチャ](../../tests/external-site/README.md) はどちらも `riebeckite build` を使い、Vite の出力を `dist/` へ書き出します。
- 最初の `npm install` で作られた `package-lock.json` をコミットしていること。CI で `npm ci` を再現性よく実行するために使います。
- Workers を有効にした Cloudflare アカウント。

## テンプレートの適用

1. `wrangler.jsonc` をサイトのルートにコピーし、`name` を一意の Worker 名に変更します。
2. `.github/workflows/deploy.yml` をサイトのリポジトリの同じパス（`.github/workflows/deploy.yml`）へコピーします。
3. **Workers Scripts: Edit** 権限を持つ Cloudflare API トークンを作成し、リポジトリのシークレットに次を追加します。
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. `main` へ push するか、Actions タブからワークフローを手動実行します。

## 別記事リポジトリ

外部記事リポジトリの checkout とデプロイの起動は別の責務です。追加の
`actions/checkout` は site workflow が記事を**読める**ようにするだけで、記事
リポジトリへの push で site workflow を起動するものではありません。記事 push
ごとにデプロイするには、次の両方を設定します。これはすべての
`create-riebeckite` preset で利用でき、preset は生成する site だけを変えます。

サイトを生成するときは、対話式の CLI で `Separate GitHub repository` を選んで
content と site のリポジトリ名を入力します。外部 content の checkout、
repository dispatch receiver、`github/notify-site.yml` がまとめて生成されます。
コマンドラインで指定する場合は
`--github-actions --content-repository OWNER/notes
--site-repository OWNER/my-site` を渡します。以下は、このテンプレートを手動で適用する場合の手順です。

1. site workflow の `repository_dispatch: types: [content-updated]` を残し、依存
   関係のインストール前に記事 checkout を追加します。

   ```yaml
   - name: Check out the external content repository
     uses: actions/checkout@v4
     with:
       repository: OWNER/NOTES
       token: ${{ secrets.RIEBECKITE_CONTENT_READ_TOKEN || github.token }}
       path: content
   ```

   `content.directory` は `"content"` にします。`ref` を固定しないため、
   `content-updated` 実行時には古い site commit ではなく既定 branch の最新記事を取得します。
2. `notify-site.yml` を記事リポジトリの `.github/workflows/notify-site.yml` に
   コピーし、`OWNER` と `SITE_REPOSITORY` を置き換えます。`SITE_DISPATCH_TOKEN`
   は**記事リポジトリ側**の Secret に登録します。
3. 推奨する fine-grained PAT は対象を**site repository**だけに絞り、
   **Contents: read and write** を与えます。GitHub の repository dispatch API は
   `Contents: write` を必要とし、トークン作成画面で対象 repository を選ぶには
   `read` も必要です。classic PAT は `repo` scope、GitHub App は
   **Contents: write** の installation token でも使えます。記事 repository の
   `GITHUB_TOKEN` は別 repository へ dispatch できないため使いません。
4. 記事 repository が public なら、記事 checkout 用 Secret は不要です。private
   または internal なら、**site repository側**の Secret に
   `RIEBECKITE_CONTENT_READ_TOKEN` を登録します。対象を記事 repository に絞り
   **Contents: read** を与えた fine-grained PAT、または同等の read-only GitHub App
   installation token を使います。

notify workflow は dispatch token が無い場合に値を出さず失敗します。対象 site
repository の指定誤り・dispatch 権限不足は `actions/github-script`、存在しない／
読めない記事 repository は checkout が明確に失敗させます。その後の
Riebeckite check/build と Cloudflare deploy も別々に結果を確認できます。

| 方法 | 記事 push で自動 deploy | 特徴 |
| --- | ---: | --- |
| 同一 repository | Yes | `push` だけでよい。 |
| 別 repository + repository dispatch | Yes | 毎回最新記事を checkout する。 |
| 別 repository + schedule | 遅延あり | schedule trigger を追加する。dispatch token は不要。 |
| manual dispatch | No | Actions タブから実行する。 |
| Git submodule | No | site 側の submodule 参照を更新して push する。 |

## ローカルでの確認

デプロイせずにビルドと設定を確認できます。

```sh
npm install
npm exec riebeckite build
npx wrangler deploy --dry-run
```

`wrangler deploy --dry-run` は Cloudflare に接続せず、`wrangler.jsonc` とアセットディレクトリを検証します。`npx wrangler dev` を使うと同じ出力をローカルで配信できます。

## ワークフローの流れ

1. リポジトリをチェックアウトする。
2. `npm ci` で依存をインストールする。
3. `npm exec riebeckite check` で設定と Plugin を読み取り専用で検証する。
4. `npm exec riebeckite build` で `dist/` を生成する。
5. リポジトリのシークレットを使って `cloudflare/wrangler-action` でデプロイする。

## 補足

- **静的アセットで足ります。** Riebeckite はビルド時にコンテンツのルートと Plugin のエンドポイントを事前生成するため、生成された `dist/` は runtime の `main` なしで静的アセットとしてデプロイされます。参照用アプリケーションも `apps/web/wrangler.jsonc` で同じ形を使っています。
- **ビルド状態はビルド時に留まります。** `.riebeckite/` と Plugin cache は `dist/` に含まれず、Worker runtime へは渡りません。
- **添付ファイルはサイトが管理します。** 公開するファイルだけを、参照用アプリケーションのようにビルド前の `prebuild` 手順でコピーしてください。

## 関連資料

- [利用ガイド — プレビューとデプロイ](../../docs/ja/docs/guides/README.md#7-プレビューとデプロイ)
- [HonoX Integration](../../docs/ja/docs/framework/honox-integration.md)
- [Build System](../../docs/ja/docs/framework/build-system.md)

