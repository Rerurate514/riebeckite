---
date: 2026-10-20
title: PageType Generator
---
# PageType Generator

`riebeckite create page-type` は、プラグインの公開 `pageTypes` API を通じて公開用の独立ページを作成します。独自のルーティングフレームワークではなく、生成されたプラグインが SSG の列挙に `paths`、ページ解決に `resolve` を使います。

```sh
riebeckite create page-type glossary
riebeckite create page-type glossary --path /reference/glossary/ --with-tests --register
riebeckite create page-type glossary --plugin reference-pages --path /glossary/
```

`--plugin` を指定しない場合、既存の Plugin Generator の `pages` テンプレート、README、必要に応じてテストを使って `extensions/<name>/` を作成します。`--plugin` を指定した場合は `page_types/<name>.ts` を作成し、認識できる `pageTypes: []` 配列にエクスポート済みの PageType を追加します。対話形式で Existing Plugin を選ぶと、エントリーポイントを持つローカルプラグインの一覧から選択できます。ほかのフックはそのまま残し、構造を認識できない場合、ID やプラグイン内のパスが重複する場合、既存ファイルがある場合は何も変更しません。その場合は手動で登録してください。

生成されたページは `manifest.discoverableEntries` だけを列挙するため、Draft、Private、Scheduled、Unlisted のコンテンツは公開されません。パスは末尾が `/` の正規化された絶対 URL パスである必要があり、トラバーサルや不正なパスは拒否します。

## 編集とテスト

生成された `resolve` 関数と `rr-<feature>` フックを編集します。信頼できない文字列はエスケープし、公開コンテンツの契約上必要な場合を除いて `discoverableEntries` を使ってください。生成されたテストを実行したうえで、次を実行します。

```sh
pnpm typecheck
riebeckite check
riebeckite build
```

ドキュメントフレームとルーティングは Site の責務です。プラグイン固有の HonoX ルートを追加したり、別のドキュメントシェルを返したりしないでください。[独立ページの追加](./recipes/pages.ja.md) と [Plugin API](../reference/plugin-api.ja.md) を参照してください。
