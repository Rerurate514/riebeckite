# Excalidraw

Obsidian Excalidraw の図を記事本文へ埋め込んで表示する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-excalidraw
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Obsidian Excalidraw で作成した図を記事と一緒に公開したい場合に利用します。Excalidrawノートや埋め込み画像を含むVaultを、その関係を保ったまま公開する用途です。

`![[drawing.excalidraw]]` はビルド時にプレースホルダが生成され、ブラウザ側で SVG に置き換わって記事内に図が表示されます。`.excalidraw` ファイルの配置が必要です。

![[HW]]

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../../packages/plugins/excalidraw/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

