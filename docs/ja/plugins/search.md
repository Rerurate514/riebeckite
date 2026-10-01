# Search

公開サイト内のコンテンツを検索する機能を追加する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-search
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

記事数が増えたサイトで、タイトルや本文から目的のページを探せる検索導線を提供します。たとえば Plugin 名や技術用語から関連ドキュメントを探す用途です。

このページでも、ヘッダーの検索バー、または `Ctrl+K`（macOS では `Cmd+K`、`/`）で検索モーダルを開けます。タイトルと本文を対象にしたあいまい検索で、最大8件まで表示されます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/search/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
