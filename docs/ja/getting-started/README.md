# Getting Started

この章は、初めて Riebeckite でサイトを作る人のための一本道です。Riebeckite 本体のリポジトリを clone する手順は扱いません。Plugin は WikiLink、図表、検索、SEO、独立ページなどの機能を追加し、Theme は見た目を変えます。組み込み Plugin のページを使うために route を設定する必要はありません。

## 流れ

1. [Installation](./installation.md) で必要な環境を確認する
2. `create-riebeckite` でサイトを作る
3. [Presets](./presets.md) で用途に合う preset を選ぶ
4. [First Content](./first-content.md) に沿って最初の記事を書く
5. ローカルで確認する
6. ビルドする
7. [Deployment](./deployment.md) に沿って公開する

## 最短手順

```bash
npx create-riebeckite my-site
cd my-site
npm install
npm exec riebeckite check
npm exec riebeckite dev
```

`content/` に Markdown を置き、`publish: true` を付けると公開対象になります。

```bash
npm exec riebeckite build
```

Cloudflare Workers に公開する場合は、ビルド後に Wrangler で `dist/` をデプロイします。GitHub Actions を使う場合は `create-riebeckite --github-actions` で生成される workflow を使います。

Riebeckite 本体を開発する場合は [Framework Development](../framework/development.md) へ進んでください。
