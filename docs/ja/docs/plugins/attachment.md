# Attachment

Markdown から参照される添付ファイルを公開サイトで扱うための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-attachment
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ノートから PDF や ZIP などの添付ファイルへリンクし、公開サイトから参照できるようにする用途です。

```markdown
[[files/specification.pdf|仕様書を開く]]
[[files/example.zip|サンプルを取得]]
```

`[[file]]` はダウンロードリンク、`![[file]]` はファイルサイズ付きの添付カードとして展開されます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/attachment/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

