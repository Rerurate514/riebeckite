# Riebeckite へのコントリビュート

Riebeckite は pnpm のモノレポで開発しています。セットアップとパッケージ構成は[フレームワーク開発](https://riebeckite.dev/ja/docs/framework/development)、公開契約を変更する前には[設計思想](https://riebeckite.dev/ja/docs/philosophy)を読んでください。

English: [CONTRIBUTING.md](./CONTRIBUTING.md)

## コードを変更する前に

1. 責務を持つパッケージを選びます。Core を HonoX、Vite、プラグイン、テーマ、アプリケーションから独立させてください。
2. 利用者に見える変更かを確認します。Riebeckite のパッケージをインストールした人が観測できるなら、変更エントリを追加します。
3. ADR が必要かを確認します。公開契約の変更、アーキテクチャ境界の変更、設計思想からの意図的な逸脱、セキュリティまたは公開に関する例外、リリース方針の変更には必要です。
4. 利用者がコードや設定を変更する必要があるなら、破壊的変更として記録し、移行手順を書きます。

通常の内部修正に ADR や変更エントリを追加しないでください。CI が検証するのはエントリの形式と生成ファイルであり、記録が必要だったかどうかではありません。

## 変更エントリ

```bash id="contrib1"
pnpm changes:new my-change
pnpm changelog
pnpm check:changes
```

エントリが `CHANGELOG.md`、リリースノートページ、GitHub Releases の正本です。エントリと再生成したファイルを同じコミットに含めてください。項目は [`changes/README.md`](./changes/README.md) を参照してください。

## ADR

[`docs/agents/adr/TEMPLATE.md`](./docs/agents/adr/TEMPLATE.md) のテンプレートを使います。並行 worktree で衝突しないよう、ファイル名は `YYYYMMDD-HHmmss-<slug>-<6 hex>.md` にします。[`docs/agents/adr/README.md`](./docs/agents/adr/README.md) の一覧にも追加してください。

## 検証

まず対象のテストを実行し、必要に応じて範囲を広げます。

```bash id="contrib2"
pnpm --filter <package> test
pnpm check
pnpm test:changelog
pnpm check:changes
pnpm check:docs
```

## Pull request

pull request テンプレートを使い、利用者への影響、判断、実行したテストを書いてください。無関係なリファクタリングを含めないでください。

## コミット

コミットメッセージは簡潔な日本語で書きます。`feat:` や `fix:` の接頭辞は使いません。例:

```text
キャッシュの依存関係検証を追加
```

## リリース

リリースはメンテナーが `pnpm release <version>` で行います。`npm publish` を手動実行しないでください。[リリース作業](https://riebeckite.dev/ja/docs/framework/release)を参照してください。
