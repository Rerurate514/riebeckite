# Permalink

コンテンツの恒久的な公開先を制御するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-permalink
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ファイル配置とは独立した安定URLを記事に持たせたい場合に利用します。ファイルを整理・移動しても公開URLを維持したいサイトで便利です。

frontmatter の `id` などを手掛かりに正規 URL（canonical）が決まり、`redirects` に指定した旧 URL からは 308 リダイレクトが返されます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/permalink/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
