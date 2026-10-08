<!-- Generated from packages/plugins/daily-notes/README_ja.md. Do not edit this page directly; edit the package README and run `pnpm docs:sync`. -->

# Daily Notes

デイリーノートから短いスニペットを取り出してサイトのウィジェットとして表示するプラグインです。

[English](./daily-notes.md)

## 推奨配置

デイリーノートは、長い非公開の日記を 1 ファイルにまとめることが少なくありません。このプラグインは生のマニフェストを読み、指定ディレクトリ配下のノートを対象に、次の順番で最初に成功した方法からスニペットを 1 つだけ取り出します。

1. frontmatter のキー（既定は `daily-summary`）
2. 見出しで示した節（既定は `今日のひとこと`）
3. コードブロック（既定は `daily-snippet`）

すべて失敗したノートは表示せず、本文を丸ごと出すこともありません。長い非公開ノートは、スニペットとして明示した部分だけを提供します。

`sourceUrl` と `sourceTitle` は `isPublished` が公開と判定したときだけ付きます。非公開ノートのパーマリンクとタイトルは `null` のままなので、置き場所が漏れることはありません。

`dailyNotesPlugin()` はデータとスタイルを登録しますが、ウィジェットを自動描画しません。配置は Site が所有し、ホームページのセクションが推奨位置です。

## クイックスタート

```ts
import { defineConfig } from "@riebeckite/core";
import { dailyNotesPlugin } from "@riebeckite/plugin-daily-notes";

export default defineConfig({
  // ...
  plugins: [dailyNotesPlugin()],
});
```

ホームページ route または Site が所有するホームページセクションで明示的に描画します。

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
    source: {
      directory: "Daily",
      pathPattern: "Daily/{YYYY}-{MM}-{DD}",
      dateFormat: "YYYY/MM/DD",
    },
    extract: { frontmatter: "daily-summary", section: "今日のひとこと" },
    widget: { limit: 3 },
    dateFormat: "iso",
    locale: "en",
  },
});
```

方法を `false` にすると、その抽出を無効にできます。`pathPattern` では `{YYYY}`、`{MM}`、`{DD}`、`*` が使え、ノートのファイル名を厳密に絞り込めます。

`source.dateFormat` はノートのファイル名が使う Obsidian（Moment）の日付フォーマットです（既定 `YYYY-MM-DD`）。Obsidian の Daily Notes の日付フォーマットに合わせて設定します（例: `YYYY/MM/DD`、`YYYY.MM.DD`）。slug の日付はこの形式ちょうどで読み取り、対応していない形式ではほかの形式を推測せず日付なしにします。

`dateFormat` はウィジェットの日付表示を決めます。既定は `"iso"`（`YYYY-MM-DD`）で、ほかに `"long"` と `"short"` があります。`"long"` と `"short"` は `locale`（既定 `"en"`）で整形します。機械可読な `YYYY-MM-DD` は常に `<time datetime>` 属性に残り、`DailyNote.date` はその ISO 形式のまま、`DailyNote.dateDisplay` に整形後の文字列が入ります。

位置を変える・消すときは `DailyNotes` 要素を移動・削除します。公式 Starter は Daily Notes を既定で描画しません。

## 主なエクスポート

- `dailyNotesPlugin(options?)`: プラグインを作る（`style.css` を登録する）
- `getDailyNotes({ manifest, config, options? })`: 並べ替え済みの `DailyNote[]` を返す
- `DailyNotes`: ウィジェットのコンポーネント（`{ notes, limit? }`）
- `resolveDisplayOptions(options?)`: 日付表示の既定値を適用する
- `formatDailyNoteDate(dateIso, display)`: 純粋な日付整形関数
- 定数: `DEFAULT_DAILY_NOTES_DATE_FORMAT`、`DEFAULT_DAILY_NOTES_LOCALE`、`DEFAULT_SLUG_DATE_FORMAT`
- 型: `DailyNote`、`DailyNotesOptions`、`DailyNotesDateFormat`、`ResolvedDailyNotesExtract`、`ResolvedDailyNotesDisplay`

## 関連資料

- [プラグインシステム](../reference/plugin-api.ja.md)
