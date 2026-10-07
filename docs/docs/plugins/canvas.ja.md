# Canvas

Obsidian Canvas の内容を公開ページ内で表示するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-canvas
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Obsidian Canvas で作成した情報を、ノート本文だけでなく公開サイトでも参照・表示したい場合に利用します。Canvasファイルを含むVaultを公開するケースが代表例です。

canvas のコードブロックや `![[diagram.canvas]]` は、ビルド時にキャンバス表示へ置き換わります。`render` オプションで、静的 SVG・インタラクティブ・両方から描画方式を選べます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。

