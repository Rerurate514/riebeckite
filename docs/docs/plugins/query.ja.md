# Query

コンテンツに対するクエリ結果をページ内へ表示するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-query
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

コンテンツのメタデータなどを条件にして、該当する記事群を取り出して表示したい場合に利用します。たとえば特定タグの記事一覧や条件付きのコンテンツ一覧を作る用途です。

### ソース

````markdown
```query
sort:
  field: title
  order: asc
limit: 5
```
````

### 実行例

```query
sort:
  field: title
  order: asc
limit: 5
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.ja.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。

