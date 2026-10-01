# Local Graph

現在の記事を中心としたコンテンツ間のつながりをグラフとして表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-local-graph
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

現在読んでいる記事と、その周辺の記事のつながりを局所的なグラフとして確認したい場合に利用します。WikiLink を多用するナレッジベースと特に相性があります。

このページとリンク関係のあるノートがある場合、記事末尾に Local Graph として放射状のグラフが表示されます。接続が1本もない場合は非表示です。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/local-graph/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

