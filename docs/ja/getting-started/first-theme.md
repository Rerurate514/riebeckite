# 最初の Theme を変える

Theme は Riebeckite サイトの見た目を決めます — 色、タイポグラフィ、余白、レイアウト。このガイドでは **minimal** テーマに切り替えます。コンテンツファーストで清潔なデザインです。

> 機能を追加したい場合は [最初の Plugin を追加する](./first-plugin.md) を参照してください。

---

## 1. インストール

生成されたサイトのディレクトリで:

```sh
npm install @riebeckite/theme-minimal
```

---

## 2. インポート

`riebeckite.config.ts` を開き、先頭にインポートを追加:

```ts
import { minimalTheme } from "@riebeckite/theme-minimal";
```

---

## 3. Theme を変更

config の `theme` 行で `defaultTheme()` を `minimalTheme()` に置き換え:

```ts
theme: minimalTheme(),
```

---

## 4. Riebeckite を起動

開発サーバーを再起動して新しいテーマを確認:

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