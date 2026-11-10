---
date: 2026-10-07
title: Reactions（リアクション）
---
# Reactions（リアクション）

公開ノートに絵文字リアクションボタンを表示するプラグインです。プロバイダーを差し替えられるので、GitHub Discussions やデータベースなど任意のバックエンドに接続できます。件数はビルド時に表示し、ユーザーからのリアクションを受け付けるにはエンドポイントとサーバー側の訪問者識別子解決関数を設定します。

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
| `endpoint` | `string` | — | リアルタイムのリアクションに使う絶対エンドポイントパス。`resolveVisitorKey` が必要です。 |
| `resolveVisitorKey` | `(request) => string \| undefined` | — | 信頼できる訪問者識別子をサーバー側で解決します。 |

## リアルタイムのリアクション

`endpoint` を設定するとブラウザー上の操作を有効にします。解決関数は認証情報や署名付きCookieから識別子を取得してください。ブラウザーが送った任意の識別子を受け入れてはいけません。

## 関連

- [Comments](./comments.ja.md) — 本格的なコメントスレッド
- [プラグインカタログ](./README.ja.md)
