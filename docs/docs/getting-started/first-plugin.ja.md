---
date: 2026-10-08
title: 最初のプラグインを追加する
---
# 最初のプラグインを追加する

プラグインは、Riebeckite のサイトに検索や図表、埋め込みなどの機能を追加します。このガイドでは **highlight** プラグインを追加し、`==二重イコール==` 構文でテキストをハイライトできるようにします。

> 見た目を変えたい場合は、[最初のテーマを変える](./first-theme.ja.md)を参照してください。

---

## 1. インストール

生成されたサイトのディレクトリで、次のコマンドを実行してください。

```sh
npm install @riebeckite/plugin-highlight
```

---

## 2. インポート

`riebeckite.config.ts` を開き、先頭にインポートを追加してください。

```ts
import { highlight } from "@riebeckite/plugin-highlight";
```

---

## 3. プラグインを追加

`plugins` 配列に `highlight()` を追加してください。

```ts
plugins: [
  // ... 既存の plugin
  highlight(),
],
```

---

## 4. 試す

開発サーバーを再起動するか、起動していない場合は起動してください。

```sh
npm exec riebeckite dev
```

サイトを開き、Markdown ファイル（例: `content/index.md`）を編集して、ハイライトを書いてください。

```md
この文には ==ハイライトされる語句== が含まれています。
```

保存してページを見ると、`==` で囲まれた部分がハイライトされています。

---

## 5. 次のステップ

- [プラグインのリファレンス](../plugins/README.ja.md)で他のプラグインを探す
- Chromium を使わない静的な図表には `@riebeckite/plugin-mermaid-pele` を試す
- グラフの可視化には `@riebeckite/plugin-graphviz` を試す
- [はじめてのプラグイン作成](../plugins/writing-a-plugin.ja.md)を読む
