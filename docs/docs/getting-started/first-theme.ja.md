---
date: 2026-10-08
title: 最初のテーマを変える
---
# 最初のテーマを変える

テーマは、色、タイポグラフィ、余白、レイアウトなど、Riebeckite サイトの見た目を決めます。このガイドでは、コンテンツ重視のすっきりしたデザインである **minimal** テーマに切り替えます。

> 機能を追加したい場合は、[最初のプラグインを追加する](./first-plugin.ja.md)を参照してください。

---

## 1. インストール

生成されたサイトのディレクトリで、次のコマンドを実行してください。

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

## 3. テーマを変更

設定の `theme` の行で、`defaultTheme()` を `minimalTheme()` に置き換えてください。

```ts
theme: minimalTheme(),
```

---

## 4. Riebeckite を起動

開発サーバーを再起動して、新しいテーマを確認してください。

```sh
npm exec riebeckite dev
```

サイトを開くと、見た目が minimal テーマに変わっています。

---

## 5. 次のステップ

- [テーマのリファレンス](../themes/README.ja.md)で他のテーマを探す
- 暗くカラフルな `@riebeckite/theme-tokyonight` を試す
- 軽やかで上品な `@riebeckite/theme-sakura` を試す
- [はじめてのテーマ作成](../themes/writing-a-theme.ja.md)を読む
