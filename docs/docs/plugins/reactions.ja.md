---
date: 2026-10-07
title: Reactions（リアクション）
---
# Reactions（リアクション）

公開ノートに絵文字リアクションボタンを表示するプラグインです。プロバイダーを差し替えられるので、GitHub Discussions やデータベースなど任意のバックエンドに接続できます。表示は Site が `Reactions` コンポーネントを配置して行い、プラグインはマニフェストの HTML を注入しません。ユーザーからのリアクションを受け付けるにはエンドポイントとサーバー側の訪問者識別子解決関数を設定します。

[English](./reactions.md)

## できること

- 👍 ❤️ 🎉 💡 🤔 のリアクションボタンと件数を、Site が `Reactions` または `ArticleReactions` を配置した場所に表示
- ローカルプレビュー用の `MemoryReactionsProvider` を同梱
- `ReactionsProvider` インターフェースでお好みのバックエンドに接続

## クイックスタート

```sh
npm install @riebeckite/plugin-reactions
```

```ts
import { defineConfig } from "@riebeckite/core";
import { MemoryReactionsProvider, reactions } from "@riebeckite/plugin-reactions";

const reactionsProvider = new MemoryReactionsProvider();

export default defineConfig({
  plugins: [reactions({ provider: reactionsProvider })],
});
```

プロバイダーのインスタンスはサイトの構成で保持してください。表示側とエンドポイントが同じストアを読み書きする必要があります。

## 表示

JSX の配置はサイトが所有します。リアクションを出したい場所に `ArticleReactions` を置きます。

```tsx
import { ArticleReactions } from "@riebeckite/plugin-reactions";

<ArticleReactions />;
```

`ArticleReactions` はサイト設定からプラグインのオプションを解決し、現在の記事の `contentId` を読み取ります。記事のコンテキスト外、または `provider` が設定されていない場合は何も描画しません。`endpoint` と `resolveVisitorKey` がそろっていない場合、ボタンは無効のまま表示専用になります。

マークアップを自分で組み立てる場合は、プロバイダーを呼び出して `Reactions` コンポーネントへ渡します。

```tsx
const options = resolveReactionsOptions(siteConfigOptions);
const data = await options.provider.getReactions(contentId);

<Reactions reactions={options.reactions} data={data} interactive />;
```

プラグインはビルド時にマニフェストの HTML を注入しません。

## オプション

| オプション | 型 | 既定値 | 説明 |
| --- | --- | --- | --- |
| `provider` | `ReactionsProvider` | `MemoryReactionsProvider` | リアクション件数の保存・実行層。表示には設定が必要です。 |
| `reactions` | `ReactionType[]` | 全5種 | 表示するリアクションの種類。 |
| `className` | `string` | `"rr-reactions"` | 表示するセクションのルート CSS クラス。 |
| `ariaLabel` | `string` | `"Reactions"` | グループのアクセシブル名。 |
| `endpoint` | `string` | — | リアルタイムのリアクションに使う絶対エンドポイントパス。`resolveVisitorKey` が必要です。 |
| `resolveVisitorKey` | `(request) => string \| undefined` | — | 信頼できる訪問者識別子をサーバー側で解決します。 |

## リアルタイムのリアクション

`endpoint` を設定するとブラウザー上の操作を有効にします。このときプラグインは `[data-rr-reactions]` の存在セレクターで絞り込んだクライアントエントリを1つ登録するため、リアクションのないページではクライアントコードを読み込みません。解決関数は認証情報や署名付きCookieから識別子を取得してください。ブラウザーが送った任意の識別子を受け入れてはいけません。

## 関連

- [Comments](./comments.ja.md) — 本格的なコメントスレッド
- [プラグインカタログ](./README.ja.md)
