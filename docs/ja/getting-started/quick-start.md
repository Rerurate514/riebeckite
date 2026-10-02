# Quick Start

空のフォルダから、Riebeckite のサイトをブラウザで確認してビルドするまでの最短手順です。最初から内部構造を理解する必要はありません。

## 1. サイトを作る

```bash
npx create-riebeckite my-site
cd my-site
npm install
```

`create-riebeckite` は既定で `starter` preset を使います。成功すると `Created a starter Riebeckite site in my-site` と、次に実行するコマンドの一覧が表示されます。`npm install` は、生成されたサイトに必要な package を入れます。

生成されるサイトは、まずは1つのリポジトリとして考えれば十分です。

```text
my-site/
├─ content/
├─ app/
├─ riebeckite.config.ts
└─ package.json
```

## 2. ローカルで起動する

```bash
npm exec riebeckite dev
```

開発サーバーは、生成された HonoX/Vite アプリから起動します。ターミナルに表示された `localhost` などのローカル URL をブラウザで開いてください。Riebeckite のサイトが表示されれば成功です。

編集している間は、このコマンドを起動したままにします。止めるときは `Ctrl + C` を押します。

## 3. Markdown を編集する

`content/` フォルダを開きます。`starter` preset では、最初から次のようなサンプル Markdown が生成されます。

- `content/index.md` — 英語のトップページ
- `content/guide.md`
- `content/examples.md`
- `content/notes/planning.md`
- `content/notes/writing.md`

多言語用には `content/index.ja.md` のように `<元ファイル>.<言語>.md` の名前が隣に並びます。日本語から始めるなら `content/index.ja.md` を編集してください。

新しいファイルを作らなくても、まずはこれらを編集して動作を確認できます。保存したらブラウザで変更を確認してください。

新しくページを作る場合は、`content/first-post.md` を追加します。

```md
---
title: First post
publish: true
---

Hello from Riebeckite.
```

`publish: true` が重要です。既定では、この指定がある Markdown だけが公開対象になります。

成功すると、ローカルサイトからページを開けます。たとえば `content/first-post.md` は `/first-post` として表示されます。`content/index.md` は英語コンテンツのトップページに使われます。

## 4. ビルドする

```bash
npm exec riebeckite build
```

成功すると、公開用の静的ファイルが `dist/` に作られます。デプロイではこのフォルダを配信します。

## 表示されないとき

まず次を確認してください。

- 開発サーバーは起動したままか
- Markdown ファイルを保存したか
- frontmatter に `publish: true` があるか
- ターミナルに表示された URL を開いているか

さらに詳しく調べたい場合は、[CLI reference](../reference/cli.md) の `check`、`doctor`、`inspect` を使います。これらは診断用の便利なコマンドですが、最初の起動手順には必須ではありません。

## 次に読むページ

- [First Content](./first-content.md) — Markdown の書き方と確認方法をもう少し詳しく見る
- [Presets](./presets.md) — `starter`、`minimal`、`showcase`、`empty` を比較する
- [Deployment](./deployment.md) — ビルドしたサイトを公開する
