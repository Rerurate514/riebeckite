# Changelog

変更履歴を公開コンテンツとして扱いやすくするための Plugin です。

## 導入

```bash
npm install @riebeckite/plugin-changelog
```

Plugin の export 名や設定項目は、実装と package README を一次情報として確認してください。Riebeckite の Plugin は `riebeckite.config.ts` の `plugins` に登録して利用します。

## 使用例

更新履歴をコンテンツとして整理し、サイト上で変更内容を追いやすくしたい場合に利用します。Riebeckite自体やプロジェクトのリリースノートを公開する用途に向いています。

コンテンツディレクトリが Git ワーキングツリー内にあるビルドでは、記事末尾に「Change history」としてコミット日・件名・作成者の一覧が追加されます。履歴の検索は `content.directory` を基準に行うため、ビルドの作業ディレクトリがモノレポのアプリ側であっても動作します。ツリーの外にある場合は `changelog-content-outside-repository` 警告診断を出し、何も追加しません。

## 使いどころ

この Plugin が必要な場合だけ追加してください。Preset に含まれている場合は、同じ Plugin を重複して登録する必要はありません。

実際の表示例が用意されている場合は、[Plugin Showcase](./showcase.md) でも確認できます。

## 詳細仕様

設定項目、公開 API、制約、追加の使用例は package README を参照してください。Plugin 全体の仕組みは [Plugin System](../framework/plugin-system.md)、Plugin を作る場合は [Writing a Plugin](./writing-a-plugin.md) を参照してください。

