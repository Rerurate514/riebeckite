# Riebeckite

Riebeckite は、Markdown や Obsidian 形式のノートを、高速な静的サイトとして公開するためのフレームワークです。まずは既定の `starter` プリセットでサイトを作り、`content/` に Markdown を書いて、ブラウザで確認します。問題なければ `dist/` にビルドします。

## サイトを作る

Riebeckite でサイトを作るだけなら、このリポジトリをクローンする必要はありません。

```bash
npx create-riebeckite
```

プロジェクト名、プリセット、コンテンツの取得元、デプロイ設定を聞かれます。回答したら、続けて次のコマンドを実行します。

```bash
cd my-site
npm install
npm exec riebeckite dev
```

`my-site` は、入力したプロジェクト名に置き換えてください。プリセットは、迷ったら `starter` のままで問題ありません。`npx create-riebeckite my-site` のように引数を渡すと、プロンプトを省略できます。

あとは `content/` の Markdown を編集し、ブラウザで確認してからビルドします。

```bash
npm exec riebeckite build
```

最初に読むページ: [はじめに](./docs/docs/getting-started/README.ja.md)

## 主な機能

- Obsidian 形式の Markdown とコンテンツグラフ
- 自己完結した 4 種類のプリセット。迷ったら既定の `starter` を使います
- Markdown 処理、表示、検索、メディア、診断、デプロイを拡張するプラグイン
- 公式テーマ
- ローカル確認、ビルド、必要に応じた診断に使える CLI
- Cloudflare Workers と GitHub Actions 用テンプレート
- 必要になったときに選べる、サイトとコンテンツの別リポジトリ運用

## ドキュメント

- [ドキュメントの入口](./docs/README.ja.md)
- [プリセット](./docs/docs/getting-started/presets.ja.md)
- [ガイド](./docs/docs/guides/README.ja.md)
- [プラグイン](./docs/docs/plugins/README.ja.md)
- [テーマ](./docs/docs/themes/README.ja.md)
- [リファレンス](./docs/docs/reference/README.ja.md)
- [フレームワーク開発](./docs/docs/framework/development.ja.md)
- [English README](./README.md)

## Riebeckite 本体を開発する場合

このモノレポをクローンするのは、Riebeckite 本体、インテグレーション、プラグイン、テーマ、参照アプリを開発するときだけです。セットアップとコマンドは [フレームワーク開発](./docs/docs/framework/development.ja.md) を参照してください。
