# Backlinks

現在の記事を参照している他の記事を表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-backlinks
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ある記事を参照している別の記事を自動的に辿れるようにしたい Digital Garden で利用します。たとえば `A.md` から `[[B]]` を参照すると、B 側から A を発見できるようになります。

このページをリンクしているノートがある場合、記事末尾に Backlinks として一覧が表示されます。リンクしているノートが1件もない場合は非表示です。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/backlinks/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

