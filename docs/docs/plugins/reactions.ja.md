---
date: 2026-10-07
title: Reactions（リアクション）
---
# Reactions（リアクション）

公開ノートに絵文字リアクションボタンを表示するプラグインです。プロバイダーを差し替えられるので、GitHub Discussions やデータベースなど任意のバックエンドに接続できます。

[English](./reactions.md)

## できること

- 👍 ❤️ 🎉 💡 🤔 のリアクションボタンと件数をノートごとに表示
- ローカルプレビュー用の `MemoryReactionsProvider` を同梱
- `ReactionsProvider` インターフェースでお好みのバックエンドに接続

## クイックスタート

```sh
npm install @riebeckite/plugin-reactions
```

```ts
import { defineConfig } from "@riebeckite/core";
import { reactions } from "@riebeckite/plugin-reactions";

export default defineConfig({
  plugins: [reactions()],
});
```

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `ReactionsProvider` | `MemoryReactionsProvider` | リアクション件数の保存・実行層。 |
| `reactions` | `ReactionType[]` | 全5種 | 表示するリアクションの種類。 |
| `className` | `string` | `"rr-reactions"` | ルート要素に付く追加CSSクラス。 |
| `ariaLabel` | `string` | `"Reactions"` | グループのアクセシブル名。 |

## 関連

- [Comments](./comments.ja.md) — 本格的なコメントスレッド
- [プラグインカタログ](./README.ja.md)
