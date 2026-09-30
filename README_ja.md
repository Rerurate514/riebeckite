# Riebeckite

Riebeckite は、Markdown や Obsidian 形式のコンテンツを高速な静的サイトとして公開するためのフレームワークです。コンテンツ処理、Plugin、Theme、HonoX 連携、診断、Cloudflare Workers へのデプロイをまとめて扱えます。

## サイトを作る

Riebeckite を使うだけなら、このリポジトリを clone する必要はありません。

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite check
npm exec riebeckite dev
```

あとは `content/` に Markdown を置き、ローカルで確認して、ビルドします。

```bash
npm exec riebeckite build
```

最初に読むページ: [Getting Started](./docs/ja/getting-started/README.md)

## 主な機能

- Obsidian 形式の Markdown とコンテンツグラフ
- 自己完結した4種類の preset: `starter`、`minimal`、`showcase`、`empty`
- Markdown 処理、表示、検索、メディア、診断、デプロイを拡張する Plugin
- 公式 Theme と CSS トークン
- `check`、`doctor`、`inspect`、`dev`、`build`、`profile` を備えた CLI
- Cloudflare Workers と GitHub Actions 用テンプレート
- サイトとコンテンツを同じリポジトリ、または別リポジトリで運用する構成

## ドキュメント

- [ドキュメントの入口](./docs/ja/README.md)
- [Preset](./docs/ja/getting-started/presets.md)
- [Guides](./docs/ja/guides/README.md)
- [Plugins](./docs/ja/plugins/README.md)
- [Themes](./docs/ja/themes/README.md)
- [Reference](./docs/ja/reference/README.md)
- [Framework Development](./docs/ja/framework/development.md)
- [English README](./README.md)

## Riebeckite 本体を開発する場合

この monorepo を clone するのは、Riebeckite 本体、integration、Plugin、Theme、参照アプリを開発するときだけです。セットアップとコマンドは [Framework Development](./docs/ja/framework/development.md) を参照してください。
