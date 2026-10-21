---
title: PageType Generator
---
# PageType Generator

`riebeckite create page-type` は、Plugin の公開 `pageTypes` API を使って公開用の独立ページを生成します。独自のルーティング Framework ではなく、生成した Plugin が SSG の列挙に `paths`、ページ解決に `resolve` を使います。

```sh
riebeckite create page-type glossary
riebeckite create page-type glossary --path /reference/glossary/ --with-tests --register
riebeckite create page-type glossary --plugin reference-pages --path /glossary/
```

`--plugin` を指定しない場合は、既存の Plugin Generator の `pages` template、README、必要に応じた test を使って `extensions/<name>/` を作成します。`--plugin` を指定した場合は `page_types/<name>.ts` を作成し、認識できる `pageTypes: []` 配列に export 済みの PageType を追加します。対話形式の Existing Plugin は entry point を持つ local Plugin を一覧から選びます。ほかの Hook は保持し、認識できない構造、ID または Plugin 内の Path の重複、既存ファイルがある場合は変更しません。その場合は手動で登録してください。

生成ページは `manifest.discoverableEntries` だけを列挙するため、Draft、Private、Scheduled、Unlisted の Content は公開されません。Path は末尾が `/` の正規化済み絶対 URL Path である必要があり、Traversal や不正な Path は拒否します。

## 編集とテスト

生成した `resolve` と `rr-<feature>` Hook を編集します。信頼できない文字列は escape し、公開 Content の契約で必要になる場合以外は `discoverableEntries` を使ってください。生成 test を実行した後、次を実行します。

```sh
pnpm typecheck
riebeckite check
riebeckite build
```

Document frame と routing は Site の責務です。Plugin 固有の HonoX route や、もう一つの document shell を追加しないでください。[独立ページの追加](./recipes/pages.ja.md) と [Plugin API](../reference/plugin-api.ja.md) を参照してください。
