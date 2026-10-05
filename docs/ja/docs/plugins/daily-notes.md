# Daily Notes

デイリーノートから取り出した短いスニペットをサイトのウィジェットとして表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-daily-notes
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

`getDailyNotes({ manifest, config })` でスニペットを取得し、`DailyNotes` component をウィジェットを表示したい場所へ描画します。

```tsx
import DailyNotes, { getDailyNotes } from "@riebeckite/plugin-daily-notes";

const notes = getDailyNotes({ manifest, config });
return <DailyNotes notes={notes} />;
```

ノートごとに、明示されたスニペット（frontmatter のキー、見出しの節、コードブロックのいずれか）を1つだけ取り出し、本文の残りは出力しません。そのため長い非公開ノートでも中身が漏れません。非公開ノートのパーマリンクとタイトルは `null` のままです。

## 使いどころ

デイリーノートを書き、その中から明示した短い抜粋だけを表示したい場合に追加します。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

描画例がある場合は [Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/daily-notes/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
