# Alias

ノートに設定した別名をコンテンツの参照や表示に利用するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-alias
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

同じ記事に別名を持たせ、Obsidian 側の呼び名と公開時の参照を扱いやすくしたい場合に利用します。

```yaml
---
aliases:
  - Riebeckite入門
  - Riebeckite Guide
---
```

ビルドすると、エイリアスの URL から正規 URL への 308 リダイレクトが生成されます。URL の正規化も行い、クライアント側の JavaScript は必要ありません。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/alias/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

