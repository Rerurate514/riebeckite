# Flashcards

`flashcards` コードブロックを操作できる学習デッキに変える Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-flashcards
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

学習ノートで、カードごとに問題を表示し、答えを開き、前後移動やシャッフルをしたい場合に利用します。ビルド時にはアクセシブルな静的リストも出力されるため、JavaScript がなくても内容を読めます。

````markdown
```flashcards
What is Riebeckite? :: A tool that builds a static site from Markdown

What is the unit of publishing? :: A note
```
````

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
