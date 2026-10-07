# Sidenotes

GFM の脚注を Tufte スタイルのサイドノートに変える Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-sidenotes
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

これまでどおり通常の脚注を書きます。デスクトップでは参照の横にマージンノートとして、モバイルではタップで開くポップオーバーとして表示されます。

```markdown
Riebeckite は本文の横にマージンノートを描画します。[^1]

[^1]: デスクトップでは参照の横に、モバイルではポップオーバーに表示されます。
```

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.ja.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。
