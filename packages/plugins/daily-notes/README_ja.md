# @riebeckite/plugin-daily-notes

デイリーノートから短いスニペットを取り出してサイトのウィジェットとして表示するプラグインです。

[English](./README.md)

## 概要

デイリーノートは、長い非公開の日記を 1 ファイルにまとめることが少なくありません。このプラグインは生のマニフェストを読み、指定ディレクトリ配下のノートを対象に、次の順番で最初に成功した方法からスニペットを 1 つだけ取り出します。

1. frontmatter のキー（既定は `daily-summary`）
2. 見出しで示した節（既定は `今日のひとこと`）
3. コードブロック（既定は `daily-snippet`）

すべて失敗したノートは表示せず、本文を丸ごと出すこともありません。長い非公開ノートは、スニペットとして明示した部分だけを提供します。

`sourceUrl` と `sourceTitle` は `isPublished` が公開と判定したときだけ付きます。非公開ノートのパーマリンクとタイトルは `null` のままなので、置き場所が漏れることはありません。

## 使い方

```ts
import { defineConfig } from "@riebeckite/core";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";

export default defineConfig({
  // ...
  plugins: [dailyNotesPlugin()],
});
```

### ウィジェットを置く

```tsx
import DailyNotes, { getDailyNotes } from "@riebeckite/plugin-daily-notes";

const notes = getDailyNotes({ manifest, config });

return <DailyNotes notes={notes} />;
```

`getDailyNotes` は生の `manifest.entries` を読み、新しい順に並べ、既定の上限 5 件に絞ります。場所や抽出方法を変えたいときは `options` を渡します。

```ts
getDailyNotes({
  manifest,
  config,
  options: {
    source: { directory: "Daily", pathPattern: "Daily/{YYYY}-{MM}-{DD}" },
    extract: { frontmatter: "daily-summary", section: "今日のひとこと" },
    widget: { limit: 3 },
  },
});
```

方法を `false` にすると、その抽出を無効にできます。`pathPattern` では `{YYYY}`、`{MM}`、`{DD}`、`*` が使え、ノートのファイル名を厳密に絞り込めます。

## 主なエクスポート

- `dailyNotesPlugin(options?)`: プラグインを作る（`style.css` を登録する）
- `getDailyNotes({ manifest, config, options? })`: 並べ替え済みの `DailyNote[]` を返す
- `DailyNotes`: ウィジェットのコンポーネント（`{ notes, limit? }`）
- 型: `DailyNote`、`DailyNotesOptions`、`ResolvedDailyNotesExtract`

## 関連資料

- [プラグインシステム](../../../docs/ja/docs/reference/plugin-api.md)

