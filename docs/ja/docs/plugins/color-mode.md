# color-mode

`@riebeckite/plugin-color-mode` の使い方を説明します。

## 導入

```bash
npm install @riebeckite/plugin-color-mode
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ライト・ダーク表示を切り替えられるサイトを作る場合に利用します。読者の設定に合わせた表示や、サイト上の切替UIと組み合わせる用途です。

このページのヘッダー右上のトグルで、light / dark の表示モードを切り替えられます。未選択時はシステム設定に追随します。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/color-mode/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

