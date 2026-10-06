# Code Annotations

コードブロックに行ハイライト、フォーカス、diff マーカーを追加する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-code-annotations
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

技術記事で特定の行を目立たせたい場合に利用します。言語の後に付けた波括弧の範囲で行をハイライトし、インラインのマーカーコメントで行の追加・削除・フォーカスを指定できます。

````markdown
```js {2,4-5}
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
```
````

プレーンな `<pre><code>` だけでなく、[Code Enhance](./code-enhance.md) が生成する行ラッパーにも対応するため、併用できます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
