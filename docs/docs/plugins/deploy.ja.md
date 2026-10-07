# Deploy

公開・デプロイに関係する処理を拡張するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-deploy
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

Riebeckiteサイトをビルド後の公開先へ届ける処理をPluginとして組み込みたい場合に利用します。実際のデプロイ手順は環境ごとに異なるため、[Deployment Guide](../guides/deployment/README.ja.md) と併せて確認してください。

ビルド出力に、対象プロバイダの設定ファイルが生成されます。Cloudflare Pages / Netlify 向けの `_redirects` と `_headers`、Vercel 向けの `vercel.json`、GitHub Pages 向けの `.nojekyll` と `CNAME` などです。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.ja.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.ja.md) を参照してください。

