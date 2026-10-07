# Quality

公開コンテンツの品質確認に関する処理を追加する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-quality
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

公開前にコンテンツの品質上の問題を検出したい場合に利用します。多数の記事を管理するサイトで、レビュー時のチェックを自動化する用途に向いています。

生成済みの HTML に対するチェック結果が、manifest の diagnostic に流れます。例: `quality:img-alt-missing`、`duplicate-id`、`heading-order`、`empty-link-text`。`failOn` を指定すると、条件に当てはまる場合にビルドを失敗させられます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。

