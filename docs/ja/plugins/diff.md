# Diff

差分を読みやすい形でコンテンツ内に表示するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-diff
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

変更前後を記事内で説明するときに、diff コードブロックをそのまま読みやすく表示できます。

````markdown
```diff
- const enabled = false;
+ const enabled = true;
```
````

git の履歴が取得できるビルドでは、記事末尾にリビジョンパネルが追加され、過去の変更を追いかけられます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/diff/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
