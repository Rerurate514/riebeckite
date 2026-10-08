# @riebeckite/plugin-alias

<!-- Generated from docs/docs/plugins/alias.ja.md. Edit the canonical documentation in docs/docs/plugins and run `pnpm docs:sync`. -->

Obsidian の frontmatter `aliases`（`alias` も可）を、サイト内のリダイレクト URL に変換するプラグインです。ノートの別名でアクセスできるようにしつつ、正規のパーマリンクは変更しません。

[English](./README.md)

## できること

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

## 設定

```ts
import { defineConfig } from "@riebeckite/core";
import { aliasPlugin } from "@riebeckite/plugin-alias";

export default defineConfig({
  // ...
  plugins: [aliasPlugin()],
});
```

`permalink` プラグインと併用できます。`alias` は「解決済みの公開ロケーション」を後から拡張する（`extendContentLocations`）ため、正規パーマリンクがどのように決まっていても、その値を上書きしたり再現したりしません。

```ts
plugins: [permalinkPlugin(), aliasPlugin()],
```

## オプション

| オプション | 型 | 既定値 | 内容 |
| --- | --- | --- | --- |
| `status` | `301 \| 302 \| 307 \| 308` | `308` | 生成するリダイレクトの HTTP ステータス |

## エイリアスの正規化

エイリアスは「ノートの別名」として扱い、サイトルートからのパスに変換します。

- 先頭の `/` は無視します（`Old` も `/Old` も `/Old` になります）。
- パス区切り `/` による階層を許可します（`archive/Old` → `/archive/Old`）。
- 各セグメントはリクエストパスと同じ規則でパーセントエンコードします。日本語や空白を含む別名もそのまま使えます。
- 次のようなエイリアスは URL にできないためスキップし、警告を出します。
  - 空、または `.` / `..` だけのセグメント
  - `#`、`?`、`\` を含む
  - `//`（空セグメント）を含む
  - パーセントエンコードが壊れている

## 診断

| コード | 深刻度 | 内容 |
| --- | --- | --- |
| `alias-invalid` | warning | エイリアスを URL パスに変換できない。 |
| `alias-collision` | warning | エイリアスのパスが、別のノートの正規パーマリンクまたは既存のリダイレクトと衝突している。 |

衝突したエイリアスは登録されず、既存のパスが優先されます。

## 制限事項

- リダイレクトはビルド時に確定します。エイリアスの追加・変更はサイトを再ビルドすると反映されます。
- SSG ではリダイレクト専用の HTML ファイルは生成されません。リダイレクトはサーバー（HonoX の `resolveContentRoute`）が解決します。
- エイリアスはコンテンツグラフ（バックリンク）には含まれません。元の Markdown に書かれたリンクだけが対象です。

## エクスポート

- `aliasPlugin(options?)` / `alias(options?)` — プラグインファクトリ
- `resolveAliasPath(alias)` — エイリアスをサイト内パスへ変換する純関数（`null` で無効）
- 型: `AliasOptions`、`AliasRedirectStatus`、`ResolvedAliasOptions`

## 関連資料

- [プラグインシステム](https://github.com/Rerurate514/riebeckite/blob/main/docs/docs/reference/plugin-api.ja.md)
