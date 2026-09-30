# Marp

Marp 形式の Markdown スライドを扱うための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-marp
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Markdownから作ったMarpスライドをRiebeckiteのコンテンツとして扱いたい場合に利用します。発表資料と通常の記事を同じリポジトリで管理する用途に向いています。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/marp/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
