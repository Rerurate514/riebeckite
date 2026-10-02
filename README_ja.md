# Riebeckite

Riebeckite は、Markdown や Obsidian 形式のノートを高速な静的サイトとして公開するためのフレームワークです。まずは既定の `starter` preset でサイトを作り、`content/` に Markdown を書き、ブラウザで確認して、`dist/` にビルドします。

## サイトを作る

Riebeckite を使うだけなら、このリポジトリを clone する必要はありません。

```bash
npx create-riebeckite
```

プロンプト（プロジェクト名・preset・コンテンツの取得元・デプロイ設定）に
答えたら、続けて次を実行します。

```bash
cd my-site
npm install
npm exec riebeckite dev
```

`my-site` は入力したプロジェクト名に置き換えてください。preset は迷ったら
`starter` のままで問題ありません。引数を渡す（例:
`npx create-riebeckite my-site`）とプロンプトは省略されます。

あとは `content/` の Markdown を編集し、ブラウザで確認して、ビルドします。

```bash
npm exec riebeckite build
```

最初に読むページ: [Getting Started](./docs/ja/getting-started/README.md)

## 主な機能

- Obsidian 形式の Markdown とコンテンツグラフ
- 自己完結した4種類の preset。迷ったら既定の `starter` を使います
- Markdown 処理、表示、検索、メディア、診断、デプロイを拡張する Plugin
- 公式 Theme
- ローカル確認、ビルド、必要に応じた診断に使える CLI
- Cloudflare Workers と GitHub Actions 用テンプレート
- 必要になったときに選べる、サイトとコンテンツの別リポジトリ運用

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
