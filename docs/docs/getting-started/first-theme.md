# 最初の Theme を変える

Theme は色、タイポグラフィ、余白、レイアウトなど、Riebeckite サイトの見た目を決めます。このガイドでは **minimal** テーマに切り替えます。コンテンツファーストで清潔なデザインです。

> 機能を追加したい場合は [最初の Plugin を追加する](./first-plugin.md) を参照してください。

---

## 1. インストール

生成されたサイトのディレクトリで次のコマンドを実行してください。

```sh
npm install @riebeckite/theme-minimal
```

---

## 2. インポート

`riebeckite.config.ts` を開き、先頭にインポートを追加してください。

```ts
import { minimalTheme } from "@riebeckite/theme-minimal";
```

---

## 3. Theme を変更

config の `theme` 行で `defaultTheme()` を `minimalTheme()` に置き換えてください。

```ts
theme: minimalTheme(),
```

---

## 4. Riebeckite を起動

開発サーバーを再起動して新しいテーマを確認してください。

```sh
npm exec riebeckite dev
```

サイトを開くと、見た目が minimal テーマに変わっています。

---

## 5. 次のステップ

- [Theme リファレンス](../themes/README.md) で他のテーマを探す
- 暗くカラフルな `@riebeckite/theme-tokyonight` を試す
- 軽やかな `@riebeckite/theme-sakura` を試す
- [自作 Theme の書き方](../themes/writing-a-theme.md) を学ぶ