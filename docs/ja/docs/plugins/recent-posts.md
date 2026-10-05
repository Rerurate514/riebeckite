# Recent Posts

最近のコンテンツを一覧表示するための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-recent-posts
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

ホームや一覧ページで「最近更新・公開された記事」を見せたい場合に利用します。ブログや更新頻度の高い Digital Garden の入口に向いています。

ホームや一覧ページの article component 内で `RecentPosts`（`getRecentPosts` で取得した一覧）を描画します。記事が0件の場合は何も表示されません。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

