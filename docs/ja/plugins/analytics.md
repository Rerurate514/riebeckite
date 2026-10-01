# Analytics

アクセス解析サービスとの連携に必要な機能を追加する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-analytics
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

公開後のサイトでページ閲覧などを計測したい場合に利用します。利用する解析サービスに必要な設定を行い、Riebeckite側の統合点として使用します。具体的な設定キーは package README を参照してください。

このページのビューは、設定した provider に送信されます。集計の確認は provider 側の画面や、`analytics-untracked` を含む診断レポートで行います。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/analytics/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
