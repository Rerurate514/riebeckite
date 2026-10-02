# 最初の Plugin を追加する

Plugin は Riebeckite サイトに機能を追加します — 検索、図表、埋め込みなど。このガイドでは **highlight** プラグインを追加し、`==二重イコール==` 構文でテキストをハイライトできるようにします。

> 見た目を変えたい場合は [最初の Theme を変える](./first-theme.md) を参照してください。

---

## 1. インストール

生成されたサイトのディレクトリで:

```sh
npm install @riebeckite/plugin-highlight
```

---

## 2. インポート

`riebeckite.config.ts` を開き、先頭にインポートを追加:

```ts
import { highlight } from "@riebeckite/plugin-highlight";
```

---

## 3. Plugin を追加

`plugins` 配列に `highlight()` を追加:

```ts
plugins: [
  // ... 既存の plugin
  highlight(),
],
```

---

## 4. 試す

開発サーバーを再起動 (または起動):

```sh
npm exec riebeckite dev
```

サイトを開き、Markdown ファイル (例: `content/index.md`) を編集してハイライトを書く:

```md
この文には ==ハイライトされる語句== が含まれています。
```

保存してページを見ると、`==` で囲まれた部分がハイライトされています。

---

## 5. 次のステップ

- [Plugin リファレンス](../plugins/README.md) で他の Plugin を探す
- 図表用に `@riebeckite/plugin-mermaid` を試す
- グラフ可視化用に `@riebeckite/plugin-graphviz` を試す
- [自作 Plugin の書き方](../plugins/writing-a-plugin.md) を学ぶ