# SEO

公開ページの検索エンジン向けメタデータなど、SEO に関する処理を追加する Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-seo
```

Plugin の export 名や設定項目は、実装と package README を正本として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

公開記事のタイトル・説明・canonical情報などを検索エンジンやSNS向けに整える用途です。記事ごとの frontmatter と組み合わせて利用できます。

ビルドすると、各ページの `<head>` に canonical・OGP・JSON-LD が挿入され、`sitemap.xml`・`robots.txt`・RSS/Atom/JSON Feed も出力されます。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は [package README](../../../packages/plugins/seo/README.md) を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。
