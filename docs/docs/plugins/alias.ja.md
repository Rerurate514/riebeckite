---
date: 2026-10-08
title: Alias
---
# Alias

Obsidian の frontmatter `aliases`（`alias` も可）を、サイト内のリダイレクト URL に変換するプラグインです。ノートの別名でアクセスできるようにしつつ、正規のパーマリンクは変更しません。

[English](./alias.md)

## 概要

Vault のノートが

```md
---
title: Old Note
aliases:
  - legacy-note
  - "古いノート"
---
```

のような frontmatter を持つとき、このプラグインは次のようなリダイレクトを生成します。

- `/legacy-note` → ノートの正規パーマリンク
- `/%E5%8F%A4%E3%81%84%E3%83%8E%E3%83%BC%E3%83%88` → ノートの正規パーマリンク

リダイレクトはビルド時のマニフェストに登録され、リクエスト時に HonoX が解決します。クライアント側の JavaScript は不要です。

## インストール

```sh
npm install @riebeckite/plugin-alias
```

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { alias } from "@riebeckite/plugin-alias";

export default defineConfig({
  // ...
  plugins: [alias()],
});
```

`permalink` プラグインと併用できます。`alias` は解決済みの公開ロケーションを `extendContentLocations` で後から拡張するため、正規パーマリンクがどのように決まっていても、その値を上書きしたり再現したりしません。

```ts
plugins: [permalink(), alias()],
```

サイトが l10n プラグインで多言語化している場合、`alias` はローカライズの後に動き、エイリアスをノートの言語プレフィックス付きで登録します。日本語ノートの `aliases` の同じ値は `/ja/…` に、英語版はプレフィックスなしのパスになり、両者は衝突しません。

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `status` | `301 \| 302 \| 307 \| 308` | `308` | 生成するリダイレクトの HTTP ステータス |
| `maxSegmentLength` | `number` | 未設定 | パーセントエンコード後の各パスセグメントの最大長。超えるエイリアスはスキップされます |

## エイリアスの正規化

エイリアスはノートの別名として扱い、サイトルートからのパスに変換します。

- 先頭の `/` は無視します（`Old` も `/Old` も `/Old` になります）。
- パス区切り `/` による階層を許可します（`archive/Old` → `/archive/Old`）。
- 各セグメントはリクエストパスと同じ規則でパーセントエンコードします。日本語や空白を含む別名もそのまま使えます。
- 次のようなエイリアスは URL にできないためスキップし、警告を出します。
  - 空、または `.` / `..` だけのセグメント
  - `#`、`?`、`\` を含む
  - `//`（空セグメント）を含む
  - パーセントエンコードが壊れている

- パーセントエンコード後のパスセグメントが `maxSegmentLength` を超えるエイリアスは、警告を出してスキップします。

## 診断

| コード | 深刻度 | 内容 |
| --- | --- | --- |
| `alias-invalid` | warning | エイリアスを URL パスに変換できない。 |
| `alias-collision` | warning | エイリアスのパスが、別のノートの正規パーマリンクまたは既存のリダイレクトと衝突している（同じ言語内での比較）。 |
| `alias-too-long` | warning | パスセグメントが `maxSegmentLength` を超えています。 |

衝突したエイリアスは登録されず、既存のパスが優先されます。多言語サイトでは言語プレフィックス付きのパス同士で比較するため、同じノートの翻訳どうしが同じエイリアス値を使えます。`private: true` のノートの正規パスは、公開されないためエイリアスが使えます。

## 制限事項

- リダイレクトはビルド時に確定します。エイリアスを追加・変更したときは、サイトを再ビルドしてください。
- SSG は、エイリアスを含む公開リダイレクトごとに、meta refresh を使ったリダイレクト用 HTML ページを生成します。同じリダイレクトは、開発時やリクエスト処理ではサーバー（HonoX の `resolveContentRoute`）も解決します。
- エイリアスはコンテンツグラフ（バックリンク）には含まれません。元の Markdown に書かれたリンクだけが対象です。
- パスをエイリアスに明け渡すのは `private: true` のノートだけです。下書きや、明示的な `publish` 戦略で公開を止めたノートのパスは確保されたままになります。

## エクスポート

- `alias(options)`：プラグインファクトリ
- `resolveAliasPath(alias)`：エイリアスをサイト内パスへ変換する純関数（`null` で無効）
- 型: `AliasOptions`、`AliasRedirectStatus`、`ResolvedAliasOptions`

## 関連資料

- [[plugin-api|プラグインシステム]]
